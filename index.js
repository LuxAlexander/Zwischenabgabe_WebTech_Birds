const express = require('express');
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('./db.js');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const XENO_CANTO_API_KEY = "1bc58428a6413196d11d320af58d5d360ccd3ca2";

// 1. NUR IN DER EIGENEN DB SUCHEN
app.get('/api/birds', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('birds');
        const searchQuery = req.query.query;
        let filter = {};

        if (searchQuery && searchQuery.trim() !== "") {
            filter = {
                $or: [
                    { en: { $regex: searchQuery, $options: 'i' } },
                    { loc: { $regex: searchQuery, $options: 'i' } },
                    { cnt: { $regex: searchQuery, $options: 'i' } }
                ]
            };
        }

        const birds = await collection.find(filter).toArray();
        res.json({ recordings: birds, numRecordings: birds.length });
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Abrufen aus der Datenbank.' });
    }
});

// 2. VON XENO-CANTO IN DIE DB IMPORTIEREN
app.post('/api/import', async (req, res) => {
    try {
        const { searchQuery } = req.body;
        if (!searchQuery) return res.status(400).json({ error: "Suchbegriff fehlt." });

        const db = await connectToDatabase();
        const collection = db.collection('birds');

        const url = `https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(searchQuery)}&key=${XENO_CANTO_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.recordings || data.recordings.length === 0) {
            return res.json({ message: "Keine Aufnahmen gefunden.", importedCount: 0 });
        }

        const recordingsToInsert = data.recordings.map(recording => ({
            ...recording,
            importedAt: new Date() 
        }));

        const result = await collection.insertMany(recordingsToInsert);
        res.json({ message: `Erfolgreich ${result.insertedCount} Einträge importiert!`, importedCount: result.insertedCount });
    } catch (error) {
        res.status(500).json({ error: 'Import fehlgeschlagen: ' + error.message });
    }
});

// 3. NEUEN VOGEL ERSTELLEN
app.post('/api/birds', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('birds');
        const newBird = req.body;
        
        newBird.importedAt = new Date();
        const result = await collection.insertOne(newBird);
        res.status(201).json({ _id: result.insertedId, ...newBird });
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Erstellen.' });
    }
});

// 4. EXISTIERENDEN VOGEL BEARBEITEN
app.put('/api/birds/:id', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('birds');
        const id = req.params.id;
        const updatedData = req.body;
        delete updatedData._id;

        await collection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
        res.json({ message: "Erfolgreich aktualisiert." });
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Bearbeiten.' });
    }
});

// 5. EINZELNEN VOGEL LÖSCHEN
app.delete('/api/birds/:id', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('birds');
        await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ message: "Eintrag gelöscht." });
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen.' });
    }
});

// 6. MASSEN-LÖSCHEN BASIEREND AUF PARAMETER
app.post('/api/birds/bulk-delete', async (req, res) => {
    try {
        const { deleteParam } = req.body;
        if (!deleteParam || !deleteParam.includes(':')) {
            return res.status(400).json({ error: "Bitte nutze das Format 'schluessel:wert' (z.B. cnt:austria)" });
        }

        const [key, value] = deleteParam.split(':').map(s => s.trim());
        const db = await connectToDatabase();
        const collection = db.collection('birds');

        let filter = {};
        filter[key] = { $regex: `^${value}$`, $options: 'i' };

        const result = await collection.deleteMany(filter);
        res.json({ message: `Erfolgreich ${result.deletedCount} Einträge mit Kriterium '${deleteParam}' gelöscht.` });
    } catch (error) {
        res.status(500).json({ error: 'Massen-Löschen fehlgeschlagen.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://127.0.0.1:${PORT}`);
});