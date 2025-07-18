require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const serveStatic = require('serve-static');
const app = express();

app.use(cors());
app.use(express.json());
app.use(serveStatic(__dirname, { index: ['index.html'] }));

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

let db;

// **Hier nur EINMAL verbinden und DB merken!**
async function start() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to ${dbName}`);
    app.listen(3000, '0.0.0.0', () => {
      console.log('Listening on port 3000');
    });
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}
start();

// **Keine neue Verbindung/close mehr pro Route!**
app.post('/wine', async (req, res) => {
  try {
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

app.get('/test', (req, res) => res.send('Hallo Test'));

// **Nice To Have: Clean shutdown**
process.on('SIGINT', async () => {
  console.log('SIGINT empfangen. MongoClient wird geschlossen.');
  await client.close();
  process.exit(0);
});