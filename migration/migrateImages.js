require('dotenv').config();
const { MongoClient } = require('mongodb');
const ImageKit = require('imagekit');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const migrateImages = async (nameFilter = null) => {
  // Initialize MongoDB
  const client = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });
  
  // Initialize Imagekit
  const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });

  try {
    // Connect to MongoDB
    await client.connect();
    const db = client.db();
    const collection = db.collection('wines');

    // Fetch documents with _id, imageUrl, and matching name (if provided)
    const query = nameFilter ? { name: nameFilter } : {};
    const documents = await collection.find(query, { projection: { _id: 1, imageUrl: 1, name: 1 } }).toArray();
    console.log(`Found ${documents.length} documents to process for name: ${nameFilter || 'all'}`);

    for (const doc of documents) {
      const { _id, imageUrl, name } = doc;

      if (!imageUrl) {
        console.log(`No imageUrl for document ${_id} (${name}), skipping`);
        continue;
      }

      try {
        // Download image
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Generate temporary file path
        const tempFilePath = path.join(__dirname, `temp_${_id}.jpg`);

        // Save image temporarily
        await fs.writeFile(tempFilePath, buffer);

        // Upload to Imagekit
        const uploadResponse = await imagekit.upload({
          file: buffer,
          fileName: `wine_${_id}.jpg`,
          folder: '/wines'
        });

        // Get new Imagekit URL
        const newImageUrl = uploadResponse.url;
        console.log(`Uploaded image for ${_id} (${name}) to ${newImageUrl}`);

        // Update MongoDB with new URL
        await collection.updateOne(
          { _id: doc._id },
          { $set: { imageUrl: newImageUrl } }
        );
        console.log(`Updated MongoDB for ${_id} (${name}) with new URL`);

        // Clean up temporary file
        await fs.unlink(tempFilePath);
      } catch (error) {
        console.error(`Error processing image for ${_id} (${name}):`, error.message);
      }
    }

    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await client.close();
  }
};

// Example: Filter by wine name (replace 'TestWine' with desired name)
const nameFilter = process.env.NAME_FILTER || 'TestWine';
migrateImages(nameFilter);