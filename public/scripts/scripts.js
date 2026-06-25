const { createApp } = Vue;

createApp({
    data() {
        return {
            // Search and filter values
            searchParam: '',
            importParam: 'cnt:austria',
            bulkDeleteParam: '',

            // UI state
            isImporting: false,
            isAuthenticated: false,

            // Database data
            recordings: [],
            totalRecordings: 0,
            selectedBird: null,

            // Form data for creating/editing a recording
            formBird: {
                en: '',
                gen: '',
                sp: '',
                loc: '',
                cnt: '',
                file: '',
                type: '',
                rec: ''
            },

            isEditMode: false,
            currentEditId: null,

            // Chart.js instances (kept so they can be replaced later)
            chart: null,
            typeChart: null,

            // Bootstrap modal instance
            formModalBootstrap: null,

            // Data for accessible tables shown below the charts
            statsData: {
                recorders: {},
                types: {}
            }
        }
    },

    methods: {

        // Check if the user is logged in
        async checkAuth() {
            try {
                const res = await fetch('/secret', { method: 'GET', redirect: 'manual' });
                this.isAuthenticated = res.ok;
            } catch {
                this.isAuthenticated = false;
            }
        },

        // Load recordings from the database
        async fetchDBData() {
            try {
                const response = await fetch(`/api/birds?query=${encodeURIComponent(this.searchParam)}`);
                const data = await response.json();

                this.recordings = data.recordings || [];
                this.totalRecordings = data.numRecordings || 0;

                // Refresh charts whenever new data is loaded
                this.updateChart(this.recordings);

            } catch (error) {
                console.error("Fehler beim Laden:", error);
            }
        },

        // Import recordings from the external API
        async importFromAPI() {
            this.isImporting = true;

            try {
                const response = await fetch('/api/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        searchQuery: this.importParam
                    })
                });

                const result = await response.json();

                alert(result.message);

                // Reload the table after importing
                this.fetchDBData();

            } catch {
                alert("Fehler beim Import.");
            } finally {
                this.isImporting = false;
            }
        },

        // Open an empty form for a new recording
        openCreateModal() {
            this.isEditMode = false;

            this.formBird = {
                en: '',
                gen: '',
                sp: '',
                loc: '',
                cnt: '',
                file: '',
                type: '',
                rec: ''
            };

            this.formModalBootstrap.show();
        },

        // Fill the form with existing data
        openEditModal(bird) {
            this.isEditMode = true;
            this.currentEditId = bird._id;
            this.formBird = { ...bird };

            this.formModalBootstrap.show();
        },

        // Save either a new recording or update an existing one
        async saveBird() {

            const url = this.isEditMode
                ? `/api/birds/${this.currentEditId}`
                : '/api/birds';

            const method = this.isEditMode ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.formBird)
            });

            this.formModalBootstrap.hide();
            this.fetchDBData();
        },

        // Delete one recording
        async deleteSingle(id) {

            if (confirm("Diesen Eintrag wirklich löschen?")) {

                await fetch(`/api/birds/${id}`, {
                    method: 'DELETE'
                });

                this.fetchDBData();
            }
        },

        // Delete all recordings matching the filter
        async bulkDeleteFromDB() {

            // Simple format check before sending the request
            if (!this.bulkDeleteParam.includes(':')) {
                return alert("Bitte nutze das Format 'schluessel:wert', z.B. cnt:austria");
            }

            if (confirm(`Wirklich ALLE Einträge löschen, die auf '${this.bulkDeleteParam}' zutreffen?`)) {

                try {

                    const response = await fetch('/api/birds/bulk-delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            deleteParam: this.bulkDeleteParam
                        })
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

        // Show recording details in the modal
        openModal(bird) {

            this.selectedBird = bird;

            const el = document.getElementById('detailModal');

            if (el) {
                const modal =
                    bootstrap.Modal.getInstance(el) ||
                    new bootstrap.Modal(el);

                modal.show();
            }
        },

        // Build both charts from the currently loaded recordings
        updateChart(allRecordings) {

            // Remove old charts if there is no data
            if (!allRecordings || allRecordings.length === 0) {

                if (this.chart) {
                    this.chart.destroy();
                    this.chart = null;
                }

                if (this.typeChart) {
                    this.typeChart.destroy();
                    this.typeChart = null;
                }

                return;
            }

            const textAccessibleDark = '#111111';
            const globalFontFamily = "'Inter', sans-serif";

            // Top recordists

            const recCounts = {};

            allRecordings.forEach(r => {

                const recordist = r.rec || 'Unbekannt';

                recCounts[recordist] =
                    (recCounts[recordist] || 0) + 1;
            });

            const sortedRecs = Object.keys(recCounts)
                .sort((a, b) => recCounts[b] - recCounts[a])
                .slice(0, 5);

            const chartDataRecs =
                sortedRecs.map(rec => recCounts[rec]);

            // Store values for the screen-reader table
            this.statsData.recorders = {};

            sortedRecs.forEach(r => {
                this.statsData.recorders[r] = recCounts[r];
            });

            const canvasRec =
                document.getElementById('birdChart');

            if (canvasRec && typeof Chart !== 'undefined') {

                if (this.chart)
                    this.chart.destroy();

                this.chart = new Chart(canvasRec.getContext('2d'), {

                    type: 'bar',

                    data: {
                        labels: sortedRecs,
                        datasets: [{
                            data: chartDataRecs,
                            backgroundColor: 'rgba(21,115,41,0.85)',
                            borderColor: '#11471a',
                            borderWidth: 2,
                            borderRadius: 4
                        }]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,

                        plugins: {
                            legend: {
                                display: false
                            }
                        },

                        scales: {
                            y: {
                                title: {
                                    display: true,
                                    text: 'Anzahl der Aufnahmen',
                                    color: textAccessibleDark,
                                    font: {
                                        size: 25,
                                        family: globalFontFamily,
                                        weight: 'bold'
                                    }
                                },

                                ticks: {
                                    color: textAccessibleDark,
                                    font: {
                                        size: 20,
                                        family: globalFontFamily,
                                        weight: '600'
                                    }
                                },

                                grid: {
                                    color: 'rgba(0,0,0,0.15)'
                                }
                            },

                            x: {
                                title: {
                                    display: true,
                                    text: 'Aufnehmer',
                                    color: textAccessibleDark,
                                    font: {
                                        size: 25,
                                        family: globalFontFamily,
                                        weight: 'bold'
                                    }
                                },

                                ticks: {
                                    color: textAccessibleDark,
                                    font: {
                                        size: 20,
                                        family: globalFontFamily,
                                        weight: '600'
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // Recording types

            const typeCounts = {};

            allRecordings.forEach(r => {

                if (r.type) {

                    String(r.type)
                        .split(',')
                        .map(t => t.trim().toLowerCase())
                        .forEach(t => {

                            let cleanType = t;

                            // Group similar values together
                            if (t.includes('song'))
                                cleanType = 'Gesang';
                            else if (t.includes('call'))
                                cleanType = 'Ruf';

                            typeCounts[cleanType] =
                                (typeCounts[cleanType] || 0) + 1;
                        });

                } else {

                    typeCounts['Nicht def.'] =
                        (typeCounts['Nicht def.'] || 0) + 1;
                }
            });

            const sortedTypes = Object.keys(typeCounts)
                .sort((a, b) => typeCounts[b] - typeCounts[a])
                .slice(0, 5);

            const chartDataTypes =
                sortedTypes.map(t => typeCounts[t]);

            this.statsData.types = {};

            sortedTypes.forEach(t => {
                this.statsData.types[t] = typeCounts[t];
            });

            const canvasType =
                document.getElementById('typeChart');

            if (canvasType && typeof Chart !== 'undefined') {

                if (this.typeChart)
                    this.typeChart.destroy();

                this.typeChart = new Chart(canvasType.getContext('2d'), {

                    type: 'doughnut',

                    data: {
                        labels: sortedTypes,
                        datasets: [{
                            data: chartDataTypes,

                            // Colors that are easy to distinguish
                            backgroundColor: [
                                '#007598',
                                '#d97706',
                                '#dc2626',
                                '#4b5563',
                                '#2563eb'
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
                                    font: {
                                        size: 20,
                                        family: globalFontFamily,
                                        weight: 'bold'
                                    },
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

        // Check login status first
        await this.checkAuth();

        // Create the Bootstrap modal after Vue has rendered the page
        this.$nextTick(() => {

            const formModalEl =
                document.getElementById('formModal');

            if (formModalEl && typeof bootstrap !== 'undefined') {
                this.formModalBootstrap =
                    new bootstrap.Modal(formModalEl);
            }
        });

        // Load data when the page opens
        this.fetchDBData();
    }

}).mount('#app');