require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'wineDB';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectDB() {
  try {
    await client.connect();
    console.log(`Connected to ${dbName} at ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);
    await client.db("admin").command({ ping: 1 }); // Ping zur Verbindungsbestätigung
    return client.db(dbName);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

app.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('test');
    await collection.insertOne({ message: 'Test erfolgreich!', timestamp: new Date() });
    const data = await collection.find({}).toArray();
    res.json(data);
  } catch (err) {
    res.status(500).send('Fehler: ' + err.message);
  } finally {
    await client.close(); // Verbindung nach jedem Request schließen
  }
});

app.listen(3000, () => {
  console.log('Server läuft auf Port 3000');
});