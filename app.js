require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const serveStatic = require('serve-static');
const app = express();

app.use(cors());
app.use(express.json());
app.use(serveStatic(__dirname, { index: ['index.html'] }));

// Grundroute
app.get('/', (req, res) => {
  res.send('API läuft! 🙌');
});

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

// **Verbindung aufbauen und Server starten**
async function start() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to ${dbName}`);

    const PORT = process.env.PORT || 3000;
    const HOST = '0.0.0.0';

    app.listen(PORT, HOST, () => {
      const csName = process.env.CODESPACE_NAME;
      if (csName) {
        console.log(`➡️ Test it here: https://${csName}-${PORT}.app.github.dev/test`);
      } else {
        console.log(`Listening on http://${HOST}:${PORT}`);
      }
    });
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}
start();

// API-Endpunkt zum Einfügen eines Weins
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

// Test-Route
app.get('/test', (req, res) => res.send('Hallo Test'));

// **Clean Shutdown**
process.on('SIGINT', async () => {
  console.log('SIGINT empfangen. MongoClient wird geschlossen.');
  await client.close();
  process.exit(0);
});
