const express = require('express');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('./db.js');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000; // Flexibler Port

app.use(cookieParser());
app.use(express.json());

// Öffentlich zugängliche Dateien
app.use(express.static(path.join(__dirname, '/public')));

// API-Key aus Umgebungsvariable oder Fallback (Sicherheits-Best-Practice)
const XENO_CANTO_API_KEY = process.env.XENO_CANTO_API_KEY || "1bc58428a6413196d11d320af58d5d360ccd3ca2";

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'login.html'));
});

app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'stats.html'));
});

async function authenticateUser(req, res, next) {
    if (!req.cookies || !req.cookies.SessionID) {
        return res.status(401).json({ error: "Nicht authentifiziert" });
    }
    
    const sessionId = req.cookies.SessionID;

    if (!ObjectId.isValid(sessionId)) {
        res.clearCookie('SessionID'); // Lösche den ungültigen Cookie
        return res.status(401).json({ error: "Ungültige Sitzung" });
    }

    try {
        const db = await connectToDatabase();
        const collection = db.collection('users');
        const user = await collection.findOne({ _id: new ObjectId(sessionId) });
        
        if (user) {
            req.user = user; // Benutzer an req hängen, falls man ihn später braucht
            return next();
        } 
        
        res.status(401).json({ error: "Sitzung abgelaufen oder Benutzer existiert nicht" });
    } catch (error) {
        res.status(500).json({ error: "Interner Serverfehler bei Authentifizierung" });
    }
}

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Benutzername und Passwort erforderlich." });
    }

    try {
        const id = await storeUsertoDB(username, password);
        if (id === -1) {
            return res.status(401).json({ error: "Ungültiges Passwort oder Benutzername bereits vergeben." });
        }
        
        res.cookie('SessionID', id.toString(), { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', // true wenn HTTPS aktiv ist
            maxAge: 60 * 60 * 1000 
        }); 
        
        res.json({ success: true, message: "Erfolgreich angemeldet/registriert" });
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Login-Prozess." });
    }
});

async function storeUsertoDB(username, password) {
    const db = await connectToDatabase();
    const collection = db.collection('users');
    
    const existingUser = await collection.findOne({ username: username.trim() });
    
    if (existingUser) {
        // Wenn User existiert, Passwort prüfen
        const match = await bcrypt.compare(password, existingUser.password);
        return match ? existingUser._id : -1;
    } else {
        // Wenn User nicht existiert, neu registrieren
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const result = await collection.insertOne({ username: username.trim(), password: hashedPassword });
        return result.insertedId;
    }
}


app.get('/api/birds', async (req, res) => {
    try {
        const { query } = req.query;
        let mongoQuery = {};

        if (query && query.trim() !== "") {
            // Teilt den String bei jedem Semikolon auf (z.B. "cnt:austria; type:song")
            const parts = query.split(';');
            const andConditions = [];

            parts.forEach(part => {
                const trimmedPart = part.trim();
                
                // Prüfen, ob der Teil einen Doppelpunkt enthält (valider Parameter)
                if (trimmedPart.includes(':')) {
                    const [key, value] = trimmedPart.split(':').map(s => s.trim());
                    
                    // Erlaubte Keys definieren, um Injections oder Fehler zu vermeiden
                    const allowedKeys = ['cnt', 'loc', 'en', 'gen', 'type', 'rec', 'sp'];
                    
                    if (allowedKeys.includes(key) && value) {
                        const condition = {};
                        // "i" sorgt dafür, dass Groß-/Kleinschreibung ignoriert wird
                        condition[key] = { $regex: value, $options: 'i' }; 
                        andConditions.push(condition);
                    }
                } else if (trimmedPart !== "") {
                    // Fallback: Wenn kein Doppelpunkt da ist, suche im englischen Namen ('en')
                    andConditions.push({ en: { $regex: trimmedPart, $options: 'i' } });
                }
            });

            if (andConditions.length > 0) {
                mongoQuery = { $and: andConditions };
            }
        }

        // Verwende dein echtes Mongoose-Modell (z.B. Bird oder Recording)
        const db = await connectToDatabase();
        const collection = db.collection('birds');

        const recordings = await collection.find(mongoQuery).toArray();
        
        res.json({
            recordings: recordings,
            numRecordings: recordings.length
        });

    } catch (error) {
        console.error("Suchfehler:", error);
        res.status(500).json({ error: "Fehler bei der Suche" });
    }
});

//After this authentifizierung
app.get('/secret', authenticateUser, async (req, res) => {
    res.send("Du hast das geheime Ende erreicht!");
});

app.use(authenticateUser, express.static(path.join(__dirname, 'private')));

// MASSEN-LÖSCHEN BASIEREND AUF PARAMETER
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

// EINZELNEN VOGEL LÖSCHEN
app.delete('/api/birds/:id', async (req, res) => {
    try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Ungültige Vogel-ID-Format." });
        }

        const db = await connectToDatabase();
        const collection = db.collection('birds');
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Eintrag nicht gefunden." });
        }

        res.json({ message: "Eintrag gelöscht." });
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Löschen.' });
    }
});

// NEUEN VOGEL ERSTELLEN
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

// EXISTIERENDEN VOGEL BEARBEITEN
app.put('/api/birds/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Ungültige Vogel-ID-Format." });
        }

        const db = await connectToDatabase();
        const collection = db.collection('birds');
        const updatedData = req.body;
        delete updatedData._id; // ID darf nicht mit modifiziert werden

        const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Vogel mit dieser ID nicht gefunden." });
        }

        res.json({ message: "Erfolgreich aktualisiert." });
    } catch (error) {
        res.status(500).json({ error: 'Fehler beim Bearbeiten.' });
    }
});

// XENO-CANTO IN DIE DB IMPORTIEREN
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

app.listen(PORT, () => {
    console.log(`Server läuft auf http://127.0.0.1:${PORT}`);
});