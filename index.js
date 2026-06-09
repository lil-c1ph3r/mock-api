const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Sample credentials loaded from environment variables (injected by Vault at build/runtime)
const config = {
  awsAccessKey:  process.env.AWS_ACCESS_KEY_ID,
  awsSecretKey:  process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion:     process.env.AWS_REGION,
  dbHost:        process.env.DB_HOST,
  dbPort:        process.env.DB_PORT,
  dbName:        process.env.DB_NAME,
  dbUser:        process.env.DB_USER,
  dbPassword:    process.env.DB_PASSWORD,
  jwtSecret:     process.env.JWT_SECRET,
  apiKey:        process.env.API_KEY,
};

app.get('/', (req, res) => {
  res.json({ message: 'Mock API is running!' });
});

app.get('/hello', (req, res) => {
  res.json({ greeting: 'Hello from the mock API!' });
});

// Returns which env vars are loaded (values masked) — useful for verifying Vault injection
app.get('/config/status', (req, res) => {
  const status = Object.fromEntries(
    Object.entries(config).map(([k, v]) => [k, v ? '***set***' : 'NOT SET'])
  );
  res.json(status);
});

app.listen(port, () => {
  console.log(`Mock API listening at http://localhost:${port}`);
});



