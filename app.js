const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.send('Test funktioniert 🎉');
});

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
