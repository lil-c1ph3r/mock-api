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


const awsAccessKey = "AKIAIOSFODNN7EXAMPLE";
const awsSecretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

const githubToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyzABCD";

const openaiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHI";

const slackToken = "xoxb-123456789012-123456789012-abcdefghijklmnopqrstuvwxyzABCD";

const privateKey = `
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1FakePrivateKeyForTestingOnlyDoNotUse1234567890
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
-----END RSA PRIVATE KEY-----
`;

const randomSecret = "p9Zx7LmQ2rT8vW4yHk3Jn6Ub0Cd5Ef1Gh8Ij2Kl9Mn0Op3Qr4St6Uv7Wx8Yz";

//testing purposes only


