const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  res.send('users');
});

app.post('/api/users', (req, res) => {
  res.send('created');
});

export const router = app;
