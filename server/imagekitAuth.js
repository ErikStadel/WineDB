const express = require('express');
const ImageKit = require('imagekit');

const router = express.Router();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

router.get('/imagekit-auth', (req, res) => {
  try {
    const authParams = imagekit.getAuthenticationParameters();
    res.json(authParams);
  } catch (error) {
    console.error('Imagekit Auth Fehler:', error.message);
    res.status(500).json({ error: 'Authentifizierung fehlgeschlagen' });
  }
});

module.exports = router;