require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const serveStatic = require('serve-static');
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.0.208:3000', 'https://wine-db.vercel.app/']
}));
app.use(express.json());

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
      rebsorte: req.body.rebsorte || '',
      farbe: req.body.farbe || '',
      preis: req.body.preis || '',
      kauforte: req.body.kauforte || [],
      geschmack: req.body.geschmack || [],
      kategorie: req.body.kategorie || '',
      unterkategorie: req.body.unterkategorie || '',
      notizen: req.body.notizen || '',
      bewertung: req.body.bewertung || 0,
      imageUrl: req.body.imageUrl || '',
      timestamp: new Date(),
    };
    console.log('Eingehende Daten:', wineData);
    const result = await collection.insertOne(wineData);
    console.log('Eintrag erstellt:', result.insertedId);
    res.status(201).json({ message: 'Wein erfolgreich gespeichert', data: wineData });
  } catch (err) {
    console.error('MongoDB Fehler:', err.message);
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

// Neue Route zum Abrufen eines einzelnen Weins
app.get('/wine/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const wine = await collection.findOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    if (!wine) {
      return res.status(404).json({ message: 'Wein nicht gefunden' });
    }
    
    res.json(wine);
  } catch (err) {
    res.status(500).send('Fehler: ' + err.message);
  }
});

// Update Route
app.put('/wine/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const wineData = {
      ...req.body,
      timestamp: new Date() // Aktualisiere Timestamp bei Änderung
    };
    delete wineData._id; // ID darf nicht geändert werden
    
    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: wineData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Wein nicht gefunden' });
    }

    res.json({ 
      message: 'Wein erfolgreich aktualisiert',
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    res.status(500).send('Fehler: ' + err.message);
  }
});

app.listen(process.env.PORT || 3001, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${process.env.PORT || 3001}`);
});

process.on('SIGTERM', async () => {
  await client.close();
  console.log('MongoDB-Verbindung geschlossen');
  process.exit(0);
});

app.use((err, req, res, next) => {
  console.error('Interner Serverfehler:', err.message);
  res.status(500).json({ error: 'Interner Serverfehler', message: err.message });
});