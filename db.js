const { MongoClient } = require('mongodb')

const url = 'mongodb+srv://User:07yE5tT4BoijtUBI@birdcluster.yvhs3ot.mongodb.net/?retryWrites=true&w=majority'

const  client = new MongoClient(url)

async function connectToDatabase() {
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    const db = client.db('animalDB')
    return db
  } catch (error) {
    console.error('Error connecting to MongoDB:', error)
    throw error
  }
}

module.exports = { connectToDatabase }