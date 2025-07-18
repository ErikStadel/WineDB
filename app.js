require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.get('/', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('wineDB');
    const collection = db.collection('test');
    await collection.insertOne({ message: 'Test erfolgreich!' });
    res.send('Datenbankverbindung erfolgreich!');
  } catch (err) {
    res.status(500).send('Fehler: ' + err.message);
  }
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));