const { createApp } = Vue;

createApp({
    data() {
        return {
            searchParam: '',
            importParam: 'cnt:austria',
            bulkDeleteParam: '',
            isImporting: false,
            isAuthenticated: false,
            recordings: [],
            totalRecordings: 0,
            selectedBird: null,

            formBird: { en: '', gen: '', sp: '', loc: '', cnt: '', file: '', type: '', rec: '' },
            isEditMode: false,
            currentEditId: null,

            chart: null,
            typeChart: null,
            formModalBootstrap: null,

            // Daten für Screenreader-Tabellen im HTML
            statsData: {
                recorders: {},
                types: {}
            }
        }
    },
    methods: {
        async checkAuth() {
            try {
                const res = await fetch('/secret', { method: 'GET', redirect: 'manual' });
                this.isAuthenticated = res.ok;
            } catch {
                this.isAuthenticated = false;
            }
        },

        async fetchDBData() {
            try {
                const response = await fetch(`/api/birds?query=${encodeURIComponent(this.searchParam)}`);
                const data = await response.json();
                this.recordings = data.recordings || [];
                this.totalRecordings = data.numRecordings || 0;
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
            } catch {
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
                method,
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
                } catch {
                    alert("Fehler beim Massen-Löschen.");
                }
            }
        },

        openModal(bird) {
            this.selectedBird = bird;
            const el = document.getElementById('detailModal');
            if (el) {
                const modal = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
                modal.show();
            }
        },

        updateChart(allRecordings) {
            if (!allRecordings || allRecordings.length === 0) {
                if (this.chart) { this.chart.destroy(); this.chart = null; }
                if (this.typeChart) { this.typeChart.destroy(); this.typeChart = null; }
                return;
            }

            // Globale Konfigurationen für maximale Barrierefreiheit
            const textAccessibleDark = '#111111'; // Sattes, lesbares Off-Black
            const globalFontFamily = "'Inter', sans-serif";

            // 1. Aggregation Top 5 Recs
            const recCounts = {};
            allRecordings.forEach(r => {
                const recordist = r.rec || 'Unbekannt';
                recCounts[recordist] = (recCounts[recordist] || 0) + 1;
            });
            const sortedRecs = Object.keys(recCounts)
                .sort((a, b) => recCounts[b] - recCounts[a])
                .slice(0, 5);
            const chartDataRecs = sortedRecs.map(rec => recCounts[rec]);

            this.statsData.recorders = {};
            sortedRecs.forEach(r => this.statsData.recorders[r] = recCounts[r]);

            const canvasRec = document.getElementById('birdChart');
            if (canvasRec && typeof Chart !== 'undefined') {
                if (this.chart) this.chart.destroy();
                this.chart = new Chart(canvasRec.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: sortedRecs,
                        datasets: [{
                            data: chartDataRecs,
                            backgroundColor: 'rgba(21, 115, 41, 0.85)', // Dunkleres, kontraststarkes Grün (WCAG konform)
                            borderColor: '#11471a',
                            borderWidth: 2,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false } 
                        },
                        scales: {
                            y: {
                                title: {
                                    display: true,
                                    text: 'Anzahl der Aufnahmen',
                                    color: textAccessibleDark,
                                    font: { size: 25, family: globalFontFamily, weight: 'bold' }
                                },
                                ticks: {
                                    color: textAccessibleDark,
                                    font: { size: 20, family: globalFontFamily, weight: '600' }
                                },
                                grid: { color: 'rgba(0, 0, 0, 0.15)' }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Aufnehmer',
                                    color: textAccessibleDark,
                                    font: { size: 25, family: globalFontFamily, weight: 'bold' }
                                },
                                ticks: {
                                    color: textAccessibleDark,
                                    font: { size: 20, family: globalFontFamily, weight: '600' }
                                }
                            }
                        }
                    }
                });
            }

            // 2. Aggregation Ruftypen
            const typeCounts = {};
            allRecordings.forEach(r => {
                if (r.type) {
                    String(r.type).split(',').map(t => t.trim().toLowerCase()).forEach(t => {
                        let cleanType = t;
                        if (t.includes('song')) cleanType = 'Gesang';
                        else if (t.includes('call')) cleanType = 'Ruf';
                        typeCounts[cleanType] = (typeCounts[cleanType] || 0) + 1;
                    });
                } else {
                    typeCounts['Nicht def.'] = (typeCounts['Nicht def.'] || 0) + 1;
                }
            });
            const sortedTypes = Object.keys(typeCounts)
                .sort((a, b) => typeCounts[b] - typeCounts[a])
                .slice(0, 5);
            const chartDataTypes = sortedTypes.map(t => typeCounts[t]);

            this.statsData.types = {};
            sortedTypes.forEach(t => this.statsData.types[t] = typeCounts[t]);

            const canvasType = document.getElementById('typeChart');
            if (canvasType && typeof Chart !== 'undefined') {
                if (this.typeChart) this.typeChart.destroy();
                this.typeChart = new Chart(canvasType.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: sortedTypes,
                        datasets: [{
                            data: chartDataTypes,
                            // Kontraststarke, barrierefreie Farbpalette (besser unterscheidbar bei Farbfehlsichtigkeiten)
                            backgroundColor: [
                                '#007598', // Tiefes Cyan/Blau
                                '#d97706', // Kräftiges Amber/Gelb
                                '#dc2626', // Signalrot
                                '#4b5563', // Dunkelgrau
                                '#2563eb'  // sattes Standardblau
                            ],
                            borderColor: '#ffffff',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'left', 
                                labels: { 
                                    color: textAccessibleDark,
                                    font: { size: 20, family: globalFontFamily, weight: 'bold' }, 
                                    boxWidth: 18, 
                                    padding: 15 
                                } 
                            }
                        }
                    }
                });
            }
        }
    },

    async mounted() {
        await this.checkAuth();

        this.$nextTick(() => {
            const formModalEl = document.getElementById('formModal');
            if (formModalEl && typeof bootstrap !== 'undefined') {
                this.formModalBootstrap = new bootstrap.Modal(formModalEl);
            }
        });

        this.fetchDBData();
    }
}).mount('#app');