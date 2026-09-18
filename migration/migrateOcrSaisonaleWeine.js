const path = require('path');
const { MongoClient, ObjectId } = require('../server/node_modules/mongodb');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'wineDB';

const TARGET_IDS = [
  new ObjectId('687fd4c79380781c3695152c'),
  new ObjectId('687fd7659380781c36951530'),
  new ObjectId('6894de274c3c74913d5ccf64'),
  new ObjectId('69d7e319502c95682ab11a1c'),
];

async function run() {
  const client = new MongoClient(uri, { tls: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('wines');

    console.log('--- ZU MIGRATION VORGESEHENE WEINE ---');
    const targetWines = await collection.find({ _id: { $in: TARGET_IDS } }).toArray();
    targetWines.forEach(w => {
      console.log(`- [${w._id}] "${w.name}" (${w.rebsorte}):`);
      console.log(`    Bisher: ${w.kategorie} > ${w.unterkategorie}`);
      console.log(`    Kaufort: ${JSON.stringify(w.kauforte)}`);
    });

    // Suche in der gesamten DB nach weiteren OCR-Treffern für Saisonale Weinlese
    const allWines = await collection.find({}).toArray();
    const otherOcrMatches = allWines.filter(w => {
      const isTarget = TARGET_IDS.some(tid => tid.equals(w._id));
      if (isTarget) return false;
      const ocr = `${w.ocrRawText || ''} ${JSON.stringify(w.ocrText || '')}`.toLowerCase();
      return ocr.includes('saisonale weinlese') || (ocr.includes('saisonale') && ocr.includes('weinlese'));
    });

    if (otherOcrMatches.length > 0) {
      console.log('\n--- WEITERE WEINE MIT "SAISONALE WEINLESE" IM OCR-TEXT GEFUNDEN: ---');
      otherOcrMatches.forEach(w => {
        console.log(`- [${w._id}] "${w.name}" (${w.rebsorte}): ${w.kategorie} > ${w.unterkategorie}`);
      });
    } else {
      console.log('\nKeine weiteren Weine mit "Saisonale Weinlese" im OCR-Text gefunden.');
    }

    // Migration durchführen
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

    console.log(`\nMigration abgeschlossen:`);
    console.log(`- Gematchte Dokumente: ${result.matchedCount}`);
    console.log(`- Modifizierte Dokumente: ${result.modifiedCount}`);

    // Verifikation
    const verified = await collection.find({ _id: { $in: TARGET_IDS } }).toArray();
    console.log('\nVerifikation:');
    verified.forEach(w => {
      console.log(`  ✓ [${w._id}] "${w.name}" -> ${w.kategorie} > ${w.unterkategorie}`);
    });
  } finally {
    await client.close();
  }
}

run();
