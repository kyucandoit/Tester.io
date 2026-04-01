require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Supabase server-side client ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '2mb' }));

// --- Helper: check dashboard password ---
function authCheck(req, res) {
  if (req.body.password !== process.env.DASHBOARD_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

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

// --- Dashboard: password verification ---
app.post('/api/dashboard-auth', (req, res) => {
  const { password } = req.body;
  if (password === process.env.DASHBOARD_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// ===================== CONTACTS =====================

app.post('/api/contacts', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/contacts/delete', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { error } = await supabase.from('contacts').delete().eq('id', req.body.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===================== SUBSCRIBERS =====================

app.post('/api/subscribers', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { data, error } = await supabase.from('subscribers').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/subscribers/unsubscribe', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { error } = await supabase.from('subscribers').update({ subscribed: false }).eq('id', req.body.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/subscribers/resubscribe', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { error } = await supabase.from('subscribers').update({ subscribed: true }).eq('id', req.body.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===================== EMAIL LOG =====================

app.post('/api/email-log', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { data, error } = await supabase.from('email_log').select('*').order('sent_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/email-log/send', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { recipient, subject, body } = req.body;
  const { error } = await supabase.from('email_log').insert([{ recipient, subject, body }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===================== NEWSLETTERS =====================

app.post('/api/newsletters', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { data, error } = await supabase.from('newsletters').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/newsletters/save', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { id, title, body, status } = req.body;
  if (id) {
    const { error } = await supabase.from('newsletters').update({ title, body, status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabase.from('newsletters').insert([{ title, body, status }]);
    if (error) return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

app.post('/api/newsletters/delete', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { error } = await supabase.from('newsletters').delete().eq('id', req.body.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===================== OVERVIEW STATS =====================

app.post('/api/stats', async (req, res) => {
  if (!authCheck(req, res)) return;

  const [contacts, subs, emails] = await Promise.all([
    supabase.from('contacts').select('id, created_at'),
    supabase.from('subscribers').select('id, subscribed, created_at'),
    supabase.from('email_log').select('id, sent_at'),
  ]);

  const now = new Date();
  const todayStr = now.toDateString();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const contactRows = contacts.data || [];
  const subRows = subs.data || [];
  const emailRows = emails.data || [];

  res.json({
    formFills: contactRows.length,
    formFillsToday: contactRows.filter(c => new Date(c.created_at).toDateString() === todayStr).length,
    formFillsWeek: contactRows.filter(c => new Date(c.created_at) >= weekAgo).length,
    subscribers: subRows.filter(s => s.subscribed).length,
    unsubscribes: subRows.filter(s => !s.subscribed).length,
    emailsSent: emailRows.length,
    emailsToday: emailRows.filter(e => new Date(e.sent_at).toDateString() === todayStr).length,
  });
});

// --- Static files ---
app.use(express.static(path.join(__dirname)));

// --- Routes ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Server-side contact handler (fallback for non-JS or direct POST)
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  console.log('--- New Contact Submission ---');
  console.log(`  Name:    ${name}`);
  console.log(`  Email:   ${email}`);
  console.log(`  Message: ${message}`);

  const { error } = await supabase.from('contacts').insert([{ name, email, message }]);
  if (error) {
    console.error('Supabase error:', error.message);
  } else {
    console.log('  Saved to Supabase ✓');
  }

  try {
    await fetch(process.env.SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });
    console.log('  Sent to Google Sheets ✓');
  } catch (err) {
    console.error('Sheets error:', err.message);
  }

  console.log('------------------------------');
  res.redirect('/thank-you.html');
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
