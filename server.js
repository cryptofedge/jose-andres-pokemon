const express     = require('express');
const multer      = require('multer');
const cors        = require('cors');
const path        = require('path');
const fs          = require('fs');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const rateLimit   = require('express-rate-limit');
const { scanText, scanObject } = require('./safety');
const agent       = require('./agent');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET     = process.env.JWT_SECRET     || 'pokeball-secret-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pikachu123';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Strict limit on login — 5 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please wait 15 minutes. 🔒' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limit — 100 req/min per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Slow down! 🐢' },
});

app.use('/api/', apiLimiter);

// ── File upload ───────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(Object.assign(new Error('Images only!'), { status: 400 }));
  }
});

// ── Data helpers ──────────────────────────────────────────────────────────────
const DATA_FILE      = path.join(__dirname, 'data', 'content.json');
const USERS_FILE     = path.join(__dirname, 'data', 'users.json');
const PENDING_FILE   = path.join(__dirname, 'data', 'pending.json');
const ACTIVITY_FILE  = path.join(__dirname, 'data', 'activity.json');
const REPORTS_FILE   = path.join(__dirname, 'data', 'reports.json');

const readData     = ()  => JSON.parse(fs.readFileSync(DATA_FILE,     'utf8'));
const writeData    = d   => fs.writeFileSync(DATA_FILE,     JSON.stringify(d, null, 2));
const readUsers    = ()  => JSON.parse(fs.readFileSync(USERS_FILE,    'utf8'));
const writeUsers   = d   => fs.writeFileSync(USERS_FILE,    JSON.stringify(d, null, 2));
const readPending  = ()  => JSON.parse(fs.readFileSync(PENDING_FILE,  'utf8'));
const writePending = d   => fs.writeFileSync(PENDING_FILE,  JSON.stringify(d, null, 2));
const readActivity = ()  => JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
const writeActivity= d   => fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(d, null, 2));
const readReports  = ()  => JSON.parse(fs.readFileSync(REPORTS_FILE,  'utf8'));
const writeReports = d   => fs.writeFileSync(REPORTS_FILE,  JSON.stringify(d, null, 2));

// ── Activity logger ───────────────────────────────────────────────────────────
function logActivity({ type, userId, username, displayName, ip, detail, severity = 'info' }) {
  const db = readActivity();
  db.logs.unshift({
    id: Date.now(),
    type,        // login_success | login_fail | login_locked | account_request
                 // report | safety_flag | logout | content_add | content_delete
    userId:      userId  || null,
    username:    username|| 'anonymous',
    displayName: displayName || '',
    ip,
    detail:      detail || '',
    severity,    // info | warning | danger
    timestamp:   new Date().toISOString()
  });
  // Keep last 1000 entries
  if (db.logs.length > 1000) db.logs = db.logs.slice(0, 1000);
  writeActivity(db);
}

// ── Seed Jose's owner account ─────────────────────────────────────────────────
(async () => {
  const db = readUsers();
  if (!db.users.find(u => u.role === 'owner')) {
    db.users.push({
      id: 1,
      username: 'jose',
      displayName: 'Jose Andres',
      avatar: '⭐',
      color: '#FFCB05',
      role: 'owner',
      school: '',
      age: 6,
      failedLogins: 0,
      locked: false,
      passwordHash: await bcrypt.hash('jose123', 10),
      createdAt: new Date().toISOString()
    });
    writeUsers(db);
    console.log("✅  Jose's account ready — username: jose  password: jose123");
  }
})();

// ── Auth helpers ──────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Wrong password, trainer!' });
  next();
}

function requireToken(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Login required!' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Session expired — please log in again!' }); }
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
}

// ── Age calc ──────────────────────────────────────────────────────────────────
function calcAge(dob) {
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ══════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/content', (req, res) => res.json(readData()));

app.get('/api/friends', (req, res) => {
  const db = readUsers();
  res.json(db.users.map(({ id, displayName, avatar, color, role, school }) =>
    ({ id, displayName, avatar, color, role, school })
  ));
});

// ── Login (rate-limited, account lockout) ─────────────────────────────────────
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip  = getIP(req);
  const db  = readUsers();
  const user = db.users.find(u => u.username.toLowerCase() === (username||'').toLowerCase().trim());

  if (!user) {
    logActivity({ type: 'login_fail', username, ip, detail: 'Unknown username', severity: 'warning' });
    return res.status(401).json({ error: "Who are you? Ask Jose's family to add you! 🤔" });
  }

  // Locked account
  if (user.locked) {
    logActivity({ type: 'login_locked', userId: user.id, username: user.username, displayName: user.displayName, ip, detail: 'Attempted login on locked account', severity: 'danger' });
    return res.status(403).json({ error: '🔒 This account is locked. Ask Jose\'s family for help.' });
  }

  const ok = await bcrypt.compare(password || '', user.passwordHash);

  if (!ok) {
    user.failedLogins = (user.failedLogins || 0) + 1;
    if (user.failedLogins >= 5) {
      user.locked = true;
      writeUsers(db);
      logActivity({ type: 'login_locked', userId: user.id, username: user.username, displayName: user.displayName, ip, detail: `Account auto-locked after ${user.failedLogins} failed attempts`, severity: 'danger' });
      return res.status(403).json({ error: '🔒 Too many wrong codes! Account locked. Ask Jose\'s family for help.' });
    }
    writeUsers(db);
    logActivity({ type: 'login_fail', userId: user.id, username: user.username, displayName: user.displayName, ip, detail: `Wrong password (attempt ${user.failedLogins}/5)`, severity: 'warning' });
    return res.status(401).json({ error: `Wrong secret code! ${5 - user.failedLogins} tries left 🔑` });
  }

  // Success — reset failed counter
  user.failedLogins = 0;
  user.lastLogin = new Date().toISOString();
  user.lastIP = ip;
  writeUsers(db);

  logActivity({ type: 'login_success', userId: user.id, username: user.username, displayName: user.displayName, ip, detail: 'Successful login', severity: 'info' });

  const token = jwt.sign(
    { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, color: user.color, role: user.role },
    JWT_SECRET, { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, displayName: user.displayName, avatar: user.avatar, color: user.color, role: user.role } });
});

// ── Session restore ───────────────────────────────────────────────────────────
app.get('/api/auth/me', requireToken, (req, res) => {
  const db   = readUsers();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user || user.locked) return res.status(401).json({ error: 'Session invalid.' });
  res.json({ id: user.id, displayName: user.displayName, avatar: user.avatar, color: user.color, role: user.role });
});

// ── Account request (age gate + parental consent + safety scan) ───────────────
app.post('/api/auth/request-account', async (req, res) => {
  const ip = getIP(req);
  const { displayName, username, dob, school, parentName, parentEmail, parentConsent, selfConsent } = req.body;

  if (!displayName || !username || !dob)
    return res.status(400).json({ error: 'Please fill in all required fields.' });

  // Safety scan all text fields
  const scan = scanObject({ displayName, username, school: school||'', parentName: parentName||'' });
  if (!scan.safe) {
    logActivity({ type: 'safety_flag', username, ip, detail: `Unsafe content in signup: ${scan.flags.join(', ')}`, severity: 'danger' });
    return res.status(400).json({ error: '🚨 Your request contains inappropriate content and has been flagged.' });
  }

  const age = calcAge(dob);
  if (age < 1 || age > 120) return res.status(400).json({ error: 'Please enter a valid date of birth.' });

  if (age < 13) {
    if (!parentName || !parentEmail) return res.status(400).json({ error: 'Kids under 13 need a parent name and email.' });
    if (!parentConsent) return res.status(400).json({ error: 'A parent or guardian must check the consent box.' });
  }
  if (age >= 13 && age < 18) {
    if (!selfConsent) return res.status(400).json({ error: 'You need to confirm a parent or guardian has given permission.' });
  }

  const db      = readUsers();
  const pending = readPending();
  if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    return res.status(409).json({ error: 'That username is taken! Try another.' });
  if (pending.requests.find(r => r.username.toLowerCase() === username.toLowerCase() && r.status === 'pending'))
    return res.status(409).json({ error: 'A request with that username is already waiting.' });

  // Flag adult (18+) trying to connect to a 6-yr-old's kids site — auto-mark for review
  const suspiciousAdult = age >= 18;

  const request = {
    id: Date.now(),
    displayName,
    username: username.toLowerCase().replace(/\s+/g, ''),
    dob, age,
    school: school || '',
    parentName:    age < 13 ? (parentName  || '') : '',
    parentEmail:   age < 13 ? (parentEmail || '') : '',
    parentConsent: age < 13 ? !!parentConsent : null,
    selfConsent:   (age >= 13 && age < 18) ? !!selfConsent : null,
    status: 'pending',
    flagged: suspiciousAdult,
    flagReason: suspiciousAdult ? 'Adult (18+) requesting access to a children\'s site — manual review required' : '',
    ip,
    createdAt: new Date().toISOString()
  };

  pending.requests.push(request);
  writePending(pending);

  logActivity({
    type: 'account_request',
    username,
    ip,
    detail: `Account request: age ${age}${suspiciousAdult ? ' — ADULT, flagged for review' : ''}`,
    severity: suspiciousAdult ? 'danger' : 'info'
  });

  res.json({ ok: true });
});

// ── PIKAFELLITO Agent ───────────────────────────────────────────────────────────
const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many messages! Take a breath and try again in a minute. 🌬️' }
});

app.post('/api/agent/chat', agentLimiter, async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !sessionId)
    return res.status(400).json({ error: 'Need a message and sessionId.' });
  if (message.length > 500)
    return res.status(400).json({ error: 'Message too long!' });

  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(503).json({ error: 'Agent not configured — set ANTHROPIC_API_KEY.' });

  try {
    const result = await agent.chat(sessionId, message);
    if (result.flagged) {
      logActivity({ type: 'safety_flag', ip: getIP(req), detail: `Agent blocked unsafe message: "${message.slice(0,80)}"`, severity: 'warning' });
    }
    res.json({ reply: result.reply });
  } catch (err) {
    console.error('Agent error:', err.message);
    res.status(500).json({ error: 'PIKAFELLITO is resting! Try again in a moment. 😴' });
  }
});

// ── Report button ─────────────────────────────────────────────────────────────
app.post('/api/report', async (req, res) => {
  const ip = getIP(req);
  const { reporterName, description, aboutUser } = req.body;
  if (!description) return res.status(400).json({ error: 'Please describe what happened.' });

  const db = readReports();
  const report = {
    id: Date.now(),
    reporterName: reporterName || 'Anonymous',
    description,
    aboutUser: aboutUser || '',
    ip,
    status: 'open',
    createdAt: new Date().toISOString()
  };
  db.reports.push(report);
  writeReports(db);

  logActivity({ type: 'report', username: reporterName||'anonymous', ip, detail: `Safety report filed about: "${aboutUser||'unknown'}" — ${description.slice(0,80)}`, severity: 'danger' });

  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN API
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) res.json({ ok: true });
  else res.status(401).json({ error: 'Wrong password!' });
});

// ── Safety dashboard data ─────────────────────────────────────────────────────
app.get('/api/admin/safety', requireAdmin, (req, res) => {
  const activity = readActivity();
  const reports  = readReports();
  const pending  = readPending();
  const db       = readUsers();

  const openReports    = reports.reports.filter(r => r.status === 'open');
  const dangerLogs     = activity.logs.filter(l => l.severity === 'danger').slice(0, 50);
  const flaggedRequests= pending.requests.filter(r => r.flagged && r.status === 'pending');
  const lockedAccounts = db.users.filter(u => u.locked);

  res.json({
    alerts: {
      openReports:     openReports.length,
      dangerLogs:      dangerLogs.length,
      flaggedRequests: flaggedRequests.length,
      lockedAccounts:  lockedAccounts.length,
    },
    openReports,
    dangerLogs,
    flaggedRequests,
    lockedAccounts,
    recentActivity: activity.logs.slice(0, 100)
  });
});

// Close a report
app.post('/api/admin/reports/:id/close', requireAdmin, (req, res) => {
  const db = readReports();
  const r  = db.reports.find(r => r.id === Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Not found' });
  r.status = 'closed';
  r.closedAt = new Date().toISOString();
  writeReports(db);
  res.json({ ok: true });
});

// Lock an account
app.post('/api/admin/friends/:id/lock', requireAdmin, (req, res) => {
  const db   = readUsers();
  const user = db.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (user.role === 'owner') return res.status(403).json({ error: 'Cannot lock the owner account.' });
  user.locked = true;
  writeUsers(db);
  logActivity({ type: 'account_locked', userId: user.id, username: user.username, displayName: user.displayName, ip: 'admin', detail: 'Account locked by admin', severity: 'warning' });
  res.json({ ok: true });
});

// Unlock an account
app.post('/api/admin/friends/:id/unlock', requireAdmin, (req, res) => {
  const db   = readUsers();
  const user = db.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.locked = false;
  user.failedLogins = 0;
  writeUsers(db);
  logActivity({ type: 'account_unlocked', userId: user.id, username: user.username, displayName: user.displayName, ip: 'admin', detail: 'Account unlocked by admin', severity: 'info' });
  res.json({ ok: true });
});

// ── Pending requests ──────────────────────────────────────────────────────────
app.get('/api/admin/requests', requireAdmin, (req, res) => res.json(readPending()));

app.post('/api/admin/requests/:id/approve', requireAdmin, async (req, res) => {
  const { password, avatar, color } = req.body;
  if (!password) return res.status(400).json({ error: 'Provide a starter password.' });

  const pending = readPending();
  const r = pending.requests.find(r => r.id === Number(req.params.id));
  if (!r)              return res.status(404).json({ error: 'Not found.' });
  if (r.status !== 'pending') return res.status(409).json({ error: 'Already processed.' });

  const db = readUsers();
  if (db.users.find(u => u.username === r.username)) return res.status(409).json({ error: 'Username exists.' });

  const AVATARS = ['🐱','🐶','🐸','🦊','🐼','🐨','🦁','🐯','🐺','🦝','🐻','🐮','🦄','🐙','🦋'];
  const newUser = {
    id: Date.now(),
    username: r.username,
    displayName: r.displayName,
    avatar: avatar || AVATARS[Math.floor(Math.random()*AVATARS.length)],
    color: color || '#3D7DCA',
    role: 'friend',
    school: r.school,
    age: r.age,
    failedLogins: 0,
    locked: false,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);
  writeUsers(db);
  r.status = 'approved';
  r.approvedAt = new Date().toISOString();
  writePending(pending);
  logActivity({ type: 'account_approved', username: r.username, displayName: r.displayName, ip: 'admin', detail: `Account approved for age ${r.age}`, severity: 'info' });
  const { passwordHash: _, ...safe } = newUser;
  res.json(safe);
});

app.post('/api/admin/requests/:id/deny', requireAdmin, (req, res) => {
  const pending = readPending();
  const r = pending.requests.find(r => r.id === Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Not found.' });
  r.status = 'denied';
  r.deniedAt = new Date().toISOString();
  writePending(pending);
  logActivity({ type: 'account_denied', username: r.username, ip: 'admin', detail: `Request denied for age ${r.age}${r.flagged?' (was flagged)':''}`, severity: 'info' });
  res.json({ ok: true });
});

// ── Friends management ────────────────────────────────────────────────────────
app.get('/api/admin/friends', requireAdmin, (req, res) => {
  const db = readUsers();
  res.json(db.users.map(({ id, username, displayName, avatar, color, role, school, age, locked, failedLogins, lastLogin, createdAt }) =>
    ({ id, username, displayName, avatar, color, role, school, age, locked, failedLogins, lastLogin, createdAt })
  ));
});

app.post('/api/admin/friends', requireAdmin, async (req, res) => {
  const { displayName, username, password, school, avatar, color, age } = req.body;
  if (!displayName || !username || !password) return res.status(400).json({ error: 'Need name, username and password.' });
  const scan = scanObject({ displayName, username, school: school||'' });
  if (!scan.safe) return res.status(400).json({ error: 'Name/username contains inappropriate content.' });

  const db = readUsers();
  if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) return res.status(409).json({ error: 'Username taken.' });

  const AVATARS = ['🐱','🐶','🐸','🦊','🐼','🐨','🦁','🐯','🐺','🦝','🐻','🐮','🦄','🐙','🦋'];
  const newUser = {
    id: Date.now(),
    username: username.toLowerCase().replace(/\s+/g, ''),
    displayName,
    avatar: avatar || AVATARS[Math.floor(Math.random()*AVATARS.length)],
    color: color || '#3D7DCA',
    role: 'friend',
    school: school || '',
    age: age || null,
    failedLogins: 0,
    locked: false,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);
  writeUsers(db);
  const { passwordHash: _, ...safe } = newUser;
  res.json(safe);
});

app.delete('/api/admin/friends/:id', requireAdmin, (req, res) => {
  const db   = readUsers();
  const user = db.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Not found.' });
  if (user.role === 'owner') return res.status(403).json({ error: "Can't remove Jose!" });
  db.users = db.users.filter(u => u.id !== Number(req.params.id));
  writeUsers(db);
  res.json({ ok: true });
});

app.put('/api/admin/friends/:id/password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Need a new password.' });
  const db   = readUsers();
  const user = db.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Not found.' });
  user.passwordHash = await bcrypt.hash(password, 10);
  writeUsers(db);
  res.json({ ok: true });
});

// ── Content ───────────────────────────────────────────────────────────────────
app.post('/api/admin/gallery', requireAdmin, upload.single('image'), (req, res) => {
  const url = req.file ? `/uploads/${req.file.filename}` : (req.body.url || '').trim();
  if (!url) return res.status(400).json({ error: 'Provide an image file or URL.' });
  const data  = readData();
  const entry = { id: Date.now(), url, caption: req.body.caption||'', createdAt: new Date().toISOString() };
  data.gallery.push(entry);
  writeData(data);
  res.json(entry);
});
app.delete('/api/admin/gallery/:id', requireAdmin, (req, res) => {
  const data = readData();
  const item = data.gallery.find(g => g.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found.' });
  const fp = path.join(__dirname, item.url.replace('/', ''));
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  data.gallery = data.gallery.filter(g => g.id !== Number(req.params.id));
  writeData(data);
  res.json({ ok: true });
});
app.post('/api/admin/pokemon', requireAdmin, upload.single('image'), (req, res) => {
  const data  = readData();
  const imgUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.url || '').trim() || null;
  const entry = { id: Date.now(), name: req.body.name||'Unknown', type: req.body.type||'Normal', nickname: req.body.nickname||'', level: Number(req.body.level)||1, url: imgUrl, createdAt: new Date().toISOString() };
  data.pokemon.push(entry);
  writeData(data);
  res.json(entry);
});
app.delete('/api/admin/pokemon/:id', requireAdmin, (req, res) => {
  const data = readData();
  data.pokemon = data.pokemon.filter(p => p.id !== Number(req.params.id));
  writeData(data);
  res.json({ ok: true });
});
app.post('/api/admin/posts', requireAdmin, (req, res) => {
  const scan = scanObject({ title: req.body.title||'', body: req.body.body||'' });
  if (!scan.safe) return res.status(400).json({ error: 'Post contains inappropriate content.' });
  const data  = readData();
  const entry = { id: Date.now(), title: req.body.title||'New Post', body: req.body.body||'', createdAt: new Date().toISOString() };
  data.posts.unshift(entry);
  writeData(data);
  res.json(entry);
});
app.delete('/api/admin/posts/:id', requireAdmin, (req, res) => {
  const data = readData();
  data.posts = data.posts.filter(p => p.id !== Number(req.params.id));
  writeData(data);
  res.json({ ok: true });
});

// ── Studio AI ─────────────────────────────────────────────────────────────────
app.post('/api/studio/generate', requireAdmin, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });

  try {
    const { chat } = require('./agent');
    // Reuse agent's Anthropic client via a direct SDK call
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ result: msg.content[0].text });
  } catch (e) {
    console.error('Studio AI error:', e.message);
    res.status(500).json({ error: 'AI generation failed: ' + e.message });
  }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n🔴  Site   → http://localhost:${PORT}`);
  console.log(`🛡️   Admin  → http://localhost:${PORT}/admin`);
  console.log(`🔑  Admin password : ${ADMIN_PASSWORD}`);
  console.log(`👤  Jose login     : jose / jose123\n`);
});
