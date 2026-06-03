const { createApp } = Vue;

createApp({
    data() {
        return {
            searchParam: '',
            importParam: 'cnt:austria',
            bulkDeleteParam: '',
            isImporting: false,
            recordings: [],
            totalRecordings: 0,
            selectedBird: null,
            
            formBird: { en: '', gen: '', sp: '', loc: '', cnt: '', file: '', type: '', rec: '' },
            isEditMode: false,
            currentEditId: null,

            chart: null,
            typeChart: null,
            formModalBootstrap: null
        }
    },
    methods: {
        async fetchDBData() {
            try {
                const response = await fetch(`/api/birds?query=${encodeURIComponent(this.searchParam)}`);
                const data = await response.json();
                this.recordings = data.recordings || [];
                this.totalRecordings = data.numRecordings || 0;
                
                // Triggert das Neuzeichnen der Charts mit den aktuellen Daten
                this.updateChart(this.recordings);
            } catch (error) {
                console.error("Fehler beim Laden:", error);
            }
        },

        async importFromAPI() {
            this.isImporting = true;
            try {
                const response = await fetch('/api/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ searchQuery: this.importParam })
                });
                const result = await response.json();
                alert(result.message);
                this.fetchDBData();
            } catch (error) {
                alert("Fehler beim Import.");
            } finally {
                this.isImporting = false;
            }
        },

        openCreateModal() {
            this.isEditMode = false;
            this.formBird = { en: '', gen: '', sp: '', loc: '', cnt: '', file: '', type: '', rec: '' };
            this.formModalBootstrap.show();
        },

        openEditModal(bird) {
            this.isEditMode = true;
            this.currentEditId = bird._id;
            this.formBird = { ...bird };
            this.formModalBootstrap.show();
        },

        async saveBird() {
            const url = this.isEditMode ? `/api/birds/${this.currentEditId}` : '/api/birds';
            const method = this.isEditMode ? 'PUT' : 'POST';

            await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.formBird)
            });

            this.formModalBootstrap.hide();
            this.fetchDBData();
        },

        async deleteSingle(id) {
            if (confirm("Diesen Eintrag wirklich löschen?")) {
                await fetch(`/api/birds/${id}`, { method: 'DELETE' });
                this.fetchDBData();
            }
        },

        async bulkDeleteFromDB() {
            if (!this.bulkDeleteParam.includes(':')) {
                return alert("Bitte nutze das Format 'schluessel:wert', z.B. cnt:austria");
            }
            if (confirm(`Wirklich ALLE Einträge löschen, die auf '${this.bulkDeleteParam}' zutreffen?`)) {
                try {
                    const response = await fetch('/api/birds/bulk-delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deleteParam: this.bulkDeleteParam })
                    });
                    const result = await response.json();
                    alert(result.message || result.error);
                    this.bulkDeleteParam = '';
                    this.fetchDBData();
                } catch (error) {
                    alert("Fehler beim Massen-Löschen.");
                }
            }
        },

        openModal(bird) {
            this.selectedBird = bird;
            new bootstrap.Modal(document.getElementById('detailModal')).show();
        },

        // ==========================================
        // REPARIERTE UND ROBUSTE CHART-LOGIK
        // ==========================================
        updateChart(allRecordings) {
            // Falls keine Daten da sind, Charts leeren bzw. zerstören
            if (!allRecordings || allRecordings.length === 0) {
                if (this.chart) { this.chart.destroy(); this.chart = null; }
                if (this.typeChart) { this.typeChart.destroy(); this.typeChart = null; }
                return;
            }

            // --- CHART 1: TOP 5 RECORDISTS ---
            const recCounts = {};
            allRecordings.forEach(r => {
                const recordist = r.rec || 'Unbekannt';
                recCounts[recordist] = (recCounts[recordist] || 0) + 1;
            });
            const sortedRecs = Object.keys(recCounts).sort((a, b) => recCounts[b] - recCounts[a]).slice(0, 5);
            const chartDataRecs = sortedRecs.map(rec => recCounts[rec]);

            const canvasRec = document.getElementById('birdChart');
            if (canvasRec) {
                const ctxRec = canvasRec.getContext('2d');
                if (this.chart) this.chart.destroy(); // Verhindert Canvas-Überlappung
                this.chart = new Chart(ctxRec, {
                    type: 'bar',
                    data: {
                        labels: sortedRecs,
                        datasets: [{
                            data: chartDataRecs,
                            backgroundColor: 'rgba(40, 167, 69, 0.6)',
                            borderColor: 'rgba(40, 167, 69, 1)',
                            borderWidth: 1.5,
                            borderRadius: 6
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                });
            }

            // --- CHART 2: VERTEILUNG RUF-TYPEN ---
            const typeCounts = {};
            allRecordings.forEach(r => {
                if (r.type) {
                    const types = String(r.type).split(',').map(t => t.trim().toLowerCase());
                    types.forEach(t => {
                        let cleanType = t;
                        if (t.includes('song')) cleanType = 'Gesang (song)';
                        else if (t.includes('call')) cleanType = 'Ruf (call)';
                        typeCounts[cleanType] = (typeCounts[cleanType] || 0) + 1;
                    });
                } else {
                    typeCounts['nicht definiert'] = (typeCounts['nicht definiert'] || 0) + 1;
                }
            });
            const sortedTypes = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]).slice(0, 5);
            const chartDataTypes = sortedTypes.map(type => typeCounts[type]);

            const canvasType = document.getElementById('typeChart');
            if (canvasType) {
                const ctxType = canvasType.getContext('2d');
                if (this.typeChart) this.typeChart.destroy();
                this.typeChart = new Chart(ctxType, {
                    type: 'doughnut',
                    data: {
                        labels: sortedTypes,
                        datasets: [{
                            data: chartDataTypes,
                            backgroundColor: ['rgba(23, 162, 184, 0.7)', 'rgba(255, 193, 7, 0.7)', 'rgba(220, 53, 69, 0.7)', 'rgba(108, 117, 125, 0.7)', 'rgba(0, 123, 255, 0.7)'],
                            borderColor: ['#17a2b8', '#ffc107', '#dc3545', '#6c757d', '#007bff'],
                            borderWidth: 1.5
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
                });
            }
        }
    },
    mounted() {
        this.formModalBootstrap = new bootstrap.Modal(document.getElementById('formModal'));
        this.fetchDBData();
    }
}).mount('#app');