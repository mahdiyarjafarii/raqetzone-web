const express = require('express');
const path = require('path');

require('dotenv').config();

const app = express();

app.use(express.static(path.join(__dirname, '../dist'), {
  setHeaders: (res, filePath) => {
    if (/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff2)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

let port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is ready at port ${port}`);
});