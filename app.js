require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json()); // Für POST-Daten

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'wineDB';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
});

async function connectDB() {
  try {
    await client.connect();
    console.log(`Connected to ${dbName} at ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);
    await client.db("admin").command({ ping: 1 });
    return client.db(dbName);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

app.post('/wine', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const wineData = {
      name: req.body.name || 'Unbekannter Wein',
      hersteller: req.body.hersteller || 'Unbekannt',
      jahrgang: req.body.jahrgang || new Date().getFullYear(),
      bewertung: req.body.bewertung || 0,
      timestamp: new Date(),
    };
    await collection.insertOne(wineData);
    res.status(201).json({ message: 'Wein erfolgreich gespeichert', data: wineData });
  } catch (err) {
    res.status(500).send('Fehler: ' + err.message);
  } finally {
    await client.close();
  }
});

app.listen(3000, () => {
  console.log('Server läuft auf Port 3000');
});

app.get('/wines', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const wines = await collection.find({}).toArray();
    res.json(wines);
  } catch (err) {
    res.status(500).send('Fehler: ' + err.message);
  } finally {
    await client.close();
  }
});