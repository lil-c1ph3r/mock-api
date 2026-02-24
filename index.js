const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Mock API is running!' });
});

app.get('/hello', (req, res) => {
  res.json({ greeting: 'Hello from the mock API!' });
});

app.listen(port, () => {
  console.log(`Mock API listening at http://localhost:${port}`);
});

//testing
