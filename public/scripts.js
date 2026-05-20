const { createApp } = Vue;

createApp({
    data() {
        return {
            searchParam: 'cnt:austria',
            recordings: [],
            totalRecordings: 0,
            selectedBird: null,
            chart: null,       // Für das Balkendiagramm
            typeChart: null    // <-- NEU: Für das Kuchendiagramm
        }
    },
    methods: {
        async fetchData() {
            try {
                const response = await fetch(`/api/birds?query=${encodeURIComponent(this.searchParam)}`);

                if (!response.ok) {
                    throw new Error(`Server-Fehler: Status ${response.status}`);
                }

                const data = await response.json();
                console.log("Empfangene Daten im Frontend:", data);

                if (data && Array.isArray(data.recordings)) {
                    this.recordings = data.recordings.slice(0, 10);
                    this.totalRecordings = data.numRecordings || 0;
                    this.updateChart(data.recordings);
                } else {
                    this.recordings = [];
                    this.totalRecordings = 0;
                }

            } catch (error) {
                console.error("Fehler beim Laden der Daten:", error);
                this.recordings = [];
                this.totalRecordings = 0;
            }
        },
        // Bequeme Methode für die vordefinierten Pill-Buttons
        quickSearch(query) {
            this.searchParam = query;
            this.fetchData();
        },
        openModal(bird) {
            this.selectedBird = bird;
            const modal = new bootstrap.Modal(document.getElementById('detailModal'));
            modal.show();
        },
        updateChart(allRecordings) {
            // =========================================================
            // CHART 1: TOP 5 RECORDISTS (Balkendiagramm)
            // =========================================================
            const recCounts = {};
            allRecordings.forEach(r => {
                const recordist = r.rec || 'Unbekannt';
                recCounts[recordist] = (recCounts[recordist] || 0) + 1;
            });

            const sortedRecs = Object.keys(recCounts)
                .sort((a, b) => recCounts[b] - recCounts[a])
                .slice(0, 5);

            const chartDataRecs = sortedRecs.map(rec => recCounts[rec]);
            const ctxRec = document.getElementById('birdChart').getContext('2d');

            if (this.chart) { this.chart.destroy(); }

            this.chart = new Chart(ctxRec, {
                type: 'bar',
                data: {
                    labels: sortedRecs,
                    datasets: [{
                        label: 'Aufnahmen',
                        data: chartDataRecs,
                        backgroundColor: 'rgba(40, 167, 69, 0.6)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                }
            });

            // =========================================================
            // CHART 2: RUF-TYPEN VERTEILUNG (Doughnut/Kuchendiagramm)
            // =========================================================
            const typeCounts = {};
            allRecordings.forEach(r => {
                if (r.type) {
                    // Da oft Strings wie "song, call" vorkommen, splitten wir sie auf
                    const types = r.type.split(',').map(t => t.trim().toLowerCase());
                    types.forEach(t => {
                        // Nur die häufigsten/wichtigsten Typen standardisieren, um Unordnung zu vermeiden
                        let cleanType = t;
                        if (t.includes('song')) cleanType = 'Gesang (song)';
                        else if (t.includes('call')) cleanType = 'Ruf (call)';
                        else if (t.includes('alarm')) cleanType = 'Alarm (alarm)';
                        else if (t.includes('flight')) cleanType = 'Flugruf (flight)';

                        typeCounts[cleanType] = (typeCounts[cleanType] || 0) + 1;
                    });
                }
            });

            // Top 5 Ruf-Typen für das Kuchendiagramm extrahieren
            const sortedTypes = Object.keys(typeCounts)
                .sort((a, b) => typeCounts[b] - typeCounts[a])
                .slice(0, 5);

            const chartDataTypes = sortedTypes.map(type => typeCounts[type]);
            const ctxType = document.getElementById('typeChart').getContext('2d');

            if (this.typeChart) { this.typeChart.destroy(); }

            this.typeChart = new Chart(ctxType, {
                type: 'doughnut', // 'pie' für geschlossenen Kuchen, 'doughnut' für modernen Ring
                data: {
                    labels: sortedTypes,
                    datasets: [{
                        data: chartDataTypes,
                        backgroundColor: [
                            'rgba(23, 162, 184, 0.7)',  // Cyan
                            'rgba(255, 193, 7, 0.7)',   // Gelb
                            'rgba(220, 53, 69, 0.7)',   // Rot
                            'rgba(111, 66, 193, 0.7)',  // Lila
                            'rgba(253, 126, 20, 0.7)'   // Orange
                        ],
                        borderColor: ['#17a2b8', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'],
                        borderWidth: 1.5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right', // Legende rechts anzeigen für bessere Lesbarkeit
                            labels: { boxWidth: 12, font: { size: 11 } }
                        }
                    }
                }
            });
        }
    },
    mounted() {
        this.fetchData();
    }
}).mount('#app');