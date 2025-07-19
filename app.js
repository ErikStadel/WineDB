require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const serveStatic = require('serve-static');
const app = express();

app.use(cors());
app.use(express.json());
app.use(serveStatic(__dirname, { index: ['index.html'] })); // Serviert index.html

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'wineDB';

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  tls: true,
});

let db;

async function connectDB() {
  if (!db) {
    try {
      await client.connect();
      console.log(`Connected to ${dbName} at ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);
      await client.db("admin").command({ ping: 1 });
      db = client.db(dbName);
    } catch (err) {
      console.error('MongoDB connection error:', err.message);
      throw err;
    }
  }
  return db;
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
  }
});

app.get('/wines', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const wines = await collection.find({}).toArray();
    res.json(wines);
  } catch (err) {
    res.status(500).send('Fehler: ' + err.message);
  }
});

app.listen(3001, '0.0.0.0', () => {
  console.log('Server läuft auf Port 3001');
});

app.use((err, req, res, next) => {
  res.status(500).send('Interner Serverfehler: ' + err.message);
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.0.208:3000']
}));