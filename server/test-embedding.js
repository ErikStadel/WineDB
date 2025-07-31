const { pipeline } = require('@xenova/transformers');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
async function test() {
  const ocr = await pipeline('image-to-text', 'Xenova/trocr-large-stage1');
  const response = await axios.get('https://i.ibb.co/1fScc6Gh/25456c98-fc69-4a84-be93-14fe9360d583.jpg', { responseType: 'arraybuffer' });
  const imageBuffer = await sharp(Buffer.from(response.data)).jpeg({ quality: 90 }).resize({ width: 512, height: 512, fit: 'contain', background: 'white' }).sharpen().toBuffer();
  const tempFilePath = path.join(__dirname, 'temp_test.jpg');
  await fs.writeFile(tempFilePath, imageBuffer);
  const result = await ocr(tempFilePath);
  console.log('OCR-Resultat:', result);
  await fs.unlink(tempFilePath);
}
test();