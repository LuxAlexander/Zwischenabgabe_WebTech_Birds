const { MongoClient } = require('mongodb');

const url = "mongodb+srv://User:07yE5tT4BoijtUBI@birdcluster.yvhs3ot.mongodb.net/?appName=BirdCluster";
const client = new MongoClient(url);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully');
    const db = client.db('animalDB'); // Note: client.db() is synchronous, no 'await' needed here
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Fixed the function call here to match your defined function
connectToDatabase().catch(console.dir);

module.exports = { connectToDatabase };