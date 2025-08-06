require('dotenv').config();
const { MongoClient } = require('mongodb');
const ImageKit = require('imagekit');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const migrateImages = async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });

  try {
    console.log('Connecting to MongoDB Atlas...');
    await client.connect();
    const db = client.db('wineDB');
    const collection = db.collection('wines');

    const documents = await collection.find({}, { projection: { _id: 1, imageUrl: 1, name: 1 } }).toArray();
    console.log(`Found ${documents.length} documents to process`);

    if (documents.length === 0) {
      console.log('No documents found in wineDB.wines');
      return;
    }

    for (const doc of documents) {
      const { _id, imageUrl, name } = doc;

      if (!imageUrl || !imageUrl.startsWith('http')) {
        console.log(`Skipping ${_id} (${name || 'unnamed'}): No valid imageUrl`);
        continue;
      }

      try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        const tempFilePath = path.join(__dirname, `temp_${_id}.jpg`);
        await fs.writeFile(tempFilePath, buffer);

        const uploadResponse = await imagekit.upload({
          file: buffer,
          fileName: `wine_${_id}.jpg`,
          folder: '/wines'
        });

        const newImageUrl = uploadResponse.url;
        await collection.updateOne(
          { _id: doc._id },
          { $set: { imageUrl: newImageUrl, OldImageUrl: imageUrl } }
        );
        console.log(`Migrated ${_id} (${name || 'unnamed'}): ${newImageUrl}`);

        await fs.unlink(tempFilePath);
      } catch (error) {
        console.error(`Failed for ${_id} (${name || 'unnamed'}): ${error.message} (URL: ${imageUrl})`);
      }
    }

    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
};

migrateImages();