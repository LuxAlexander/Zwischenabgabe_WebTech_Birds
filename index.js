const express = require('express');
const axios = require('axios'); // npm install axios
const { connectToDatabase } = require('./db.js'); // Import the database connection function
const app = express();
const PORT = 3000;

app.use(express.static('public'));
const XENO_CANTO_API_KEY = "1bc58428a6413196d11d320af58d5d360ccd3ca2";

async function importXenoCantoData(searchQuery, apiKey,db_name) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(db_name);

    console.log(`Fetching data from Xeno-Canto for query: "${searchQuery}"...`);
    
    const url = `https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Xeno-Canto API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.recordings || data.recordings.length === 0) {
      console.log('No recordings found for this search query.');
      return;
    }

    console.log(`Found ${data.recordings.length} recordings. Inserting into MongoDB...`);

    const recordingsToInsert = data.recordings.map(recording => ({
      ...recording,
      importedAt: new Date() 
    }));

    const result = await collection.insertMany(recordingsToInsert);
    
    console.log(`Success! Inserted ${result.insertedCount} animal records into the database.`);

  } catch (error) {
    console.error('Failed to import data:', error);
  }
}
async function startApp() {
  //const searchQuery = "grp:birds cnt:germany"; // Example: Birds in Germany
  const searchQuery = "grp:frogs cnt:austria"; // Example: Frogs in Austria

  //await importXenoCantoData(searchQuery, XENO_CANTO_API_KEY, 'frogs');

  try {
    // 2. Call the function and wait for the database object
    const db = await connectToDatabase();

    // 3. Use the 'db' object to access a collection
    const animals = db.collection('birds');

    // 4. Run a query! (e.g., Finding all documents in that collection)
    /*const birds = await animals.find({}).toArray();
    console.log('Here are the birds in the database:', birds);

    const frogs = await db.collection('frogs').find({}).toArray();
    console.log('Here are the frogs in the database:', frogs);*/

  } catch (error) {
    console.error('App failed to run:', error);
  }
}

startApp();

app.get('/api/birds', async (req, res) => {
    try {
        let searchQuery = req.query.query;
        if (!searchQuery || searchQuery.trim() === "") {
            searchQuery = 'cnt:austria';
        }

        // Add the mandatory API key parameter using &key=
        //const url = `https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(searchQuery)}&key=${XENO_CANTO_API_KEY}`;
        const db = await connectToDatabase();
        const collection = db.collection('birds');
        const birds = await collection.find({}).toArray();
        res.json(birds);
        
        res.json(response.data);

    } catch (error) {
        console.error("API error:", error.res ? error.res.data : error.message);
        res.status(500).json({ error: 'Failed fetching data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://127.0.0.1:${PORT}`);
});