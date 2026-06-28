const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── File upload config ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(Object.assign(new Error('Images only!'), { status: 400 }));
  }
});

// ── Data helpers ────────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data', 'content.json');

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Admin auth (simple password guard) ─────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pikachu123';

function requireAuth(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password, trainer!' });
  next();
}

// ── Public API ──────────────────────────────────────────────────────────────

// GET all public content
app.get('/api/content', (req, res) => {
  res.json(readData());
});

// ── Admin API ───────────────────────────────────────────────────────────────

// Verify password
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) res.json({ ok: true });
  else res.status(401).json({ error: 'Wrong password, trainer!' });
});

// Upload gallery image
app.post('/api/admin/gallery', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const data = readData();
  const entry = {
    id: Date.now(),
    url: `/uploads/${req.file.filename}`,
    caption: req.body.caption || '',
    createdAt: new Date().toISOString()
  };
  data.gallery.push(entry);
  writeData(data);
  res.json(entry);
});

// Delete gallery image
app.delete('/api/admin/gallery/:id', requireAuth, (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const item = data.gallery.find(g => g.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(__dirname, item.url.replace('/', ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  data.gallery = data.gallery.filter(g => g.id !== id);
  writeData(data);
  res.json({ ok: true });
});

// Add a Pokemon to Jose's collection
app.post('/api/admin/pokemon', requireAuth, upload.single('image'), (req, res) => {
  const data = readData();
  const entry = {
    id: Date.now(),
    name: req.body.name || 'Unknown',
    type: req.body.type || 'Normal',
    nickname: req.body.nickname || '',
    level: Number(req.body.level) || 1,
    url: req.file ? `/uploads/${req.file.filename}` : null,
    createdAt: new Date().toISOString()
  };
  data.pokemon.push(entry);
  writeData(data);
  res.json(entry);
});

// Delete a Pokemon
app.delete('/api/admin/pokemon/:id', requireAuth, (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  data.pokemon = data.pokemon.filter(p => p.id !== id);
  writeData(data);
  res.json({ ok: true });
});

// Add a post / update
app.post('/api/admin/posts', requireAuth, (req, res) => {
  const data = readData();
  const entry = {
    id: Date.now(),
    title: req.body.title || 'New Post',
    body: req.body.body || '',
    createdAt: new Date().toISOString()
  };
  data.posts.unshift(entry);
  writeData(data);
  res.json(entry);
});

// Delete a post
app.delete('/api/admin/posts/:id', requireAuth, (req, res) => {
  const data = readData();
  data.posts = data.posts.filter(p => p.id !== Number(req.params.id));
  writeData(data);
  res.json({ ok: true });
});

// Set favorite team (up to 6 Pokemon names)
app.put('/api/admin/team', requireAuth, (req, res) => {
  const data = readData();
  data.favoriteTeam = (req.body.team || []).slice(0, 6);
  writeData(data);
  res.json({ ok: true });
});

// ── Admin panel ─────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔴 Jose Andres' Pokemon World running on http://localhost:${PORT}`);
  console.log(`🛡️  Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔑  Admin password: ${ADMIN_PASSWORD}\n`);
});
