require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Serve env config as JS (public keys only) ---
app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`
    window.__CONFIG__ = {
      SUPABASE_URL:  "${process.env.SUPABASE_URL}",
      SUPABASE_KEY:  "${process.env.SUPABASE_ANON_KEY}",
      SHEETS_URL:    "${process.env.SHEETS_URL}"
    };
  `);
});

// --- Static files ---
app.use(express.static(path.join(__dirname)));

// --- Routes ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  console.log('--- New Contact Submission ---');
  console.log(`  Name:    ${name}`);
  console.log(`  Email:   ${email}`);
  console.log(`  Message: ${message}`);
  console.log('------------------------------');

  res.redirect('/thank-you.html');
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
