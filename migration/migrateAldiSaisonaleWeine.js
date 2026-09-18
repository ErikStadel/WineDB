const path = require('path');
const { MongoClient, ObjectId } = require('../server/node_modules/mongodb');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'wineDB';

if (!uri) {
  console.error('FEHLER: MONGODB_URI ist nicht definiert.');
  process.exit(1);
}

const TARGET_IDS = [
  new ObjectId('688646749dfa21ea0f89e0fa'), // Vitello (Primitivo Merlot Saisonale Weinlese)
  new ObjectId('69fe08d0c6187142b3584fcc'), // Il Bufalo rosa ("Aldi Saisonale Weine.")
  new ObjectId('6a3e9c98f26d196d46d33715'), // Côtes Du Rhone ("Saisonale Weinlese")
  new ObjectId('6a5a48d62d16af45dbd80b82'), // Anne Gebert ("Saisonale Weinlese")
];

async function runMigration() {
  const client = new MongoClient(uri, { tls: true });

  try {
    console.log('Verbinde mit MongoDB...');
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('wines');

    console.log('Lade zu migrierende Weine...');
    const winesToMigrate = await collection.find({ _id: { $in: TARGET_IDS } }).toArray();

    console.log(`Gefundene Einträge: ${winesToMigrate.length}`);
    winesToMigrate.forEach(w => {
      console.log(`- [${w._id}] "${w.name}" (${w.rebsorte}):`);
      console.log(`    Bisher: ${w.kategorie} > ${w.unterkategorie}`);
      console.log(`    Notiz: "${w.notizen}"`);
    });

    const result = await collection.updateMany(
      { _id: { $in: TARGET_IDS } },
      {
        $set: {
          kategorie: 'Alte Bekannte',
          unterkategorie: 'Saisonale Weine',
          updatedAt: new Date(),
        },
      }
    );

    console.log(`\nAktualisierung abgeschlossen:`);
    console.log(`- Gematcht: ${result.matchedCount}`);
    console.log(`- Modifiziert: ${result.modifiedCount}`);

    // Verifikation
    const verified = await collection.find({ _id: { $in: TARGET_IDS } }).toArray();
    console.log('\nVerifikation nach Migration:');
    verified.forEach(w => {
      console.log(`  ✓ "${w.name}" -> ${w.kategorie} > ${w.unterkategorie}`);
    });

    const success = verified.every(
      w => w.kategorie === 'Alte Bekannte' && w.unterkategorie === 'Saisonale Weine'
    );
    if (success) {
      console.log('\n✅ Alle 4 saisonalen Weine erfolgreich migriert!');
    } else {
      console.warn('\n⚠️ Überprüfung fehlgeschlagen.');
    }
  } catch (err) {
    console.error('Fehler bei der Migration:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB-Verbindung getrennt.');
  }
}

runMigration();
