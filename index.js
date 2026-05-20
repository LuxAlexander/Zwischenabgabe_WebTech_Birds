const express = require('express');
const axios = require('axios'); // npm install axios
const app = express();
const PORT = 3000;

app.use(express.static('public'));
const XENO_CANTO_API_KEY = "1bc58428a6413196d11d320af58d5d360ccd3ca2";

app.get('/api/birds', async (req, res) => {
    try {
        let searchQuery = req.query.query;
        if (!searchQuery || searchQuery.trim() === "") {
            searchQuery = 'cnt:austria';
        }

        // Add the mandatory API key parameter using &key=
        const url = `https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(searchQuery)}&key=${XENO_CANTO_API_KEY}`;
        
        console.log(`Sending authenticated request to API v3...`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebEngineeringProject/1.0'
            }
        });
        
        res.json(response.data);

    } catch (error) {
        console.error("API error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed fetching data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://127.0.0.1:${PORT}`);
});