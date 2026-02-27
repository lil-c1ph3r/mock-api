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

const AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
const AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
console.log("AWS_ACCESS_KEY_ID:", AWS_ACCESS_KEY_ID);
console.log("AWS_SECRET_ACCESS_KEY:", AWS_SECRET_ACCESS_KEY);


//ssdsdsdsdsd

//sdsdsdsd