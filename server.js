const express     = require('express');
const multer      = require('multer');
const cors        = require('cors');
const path        = require('path');
const fs          = require('fs');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const rateLimit   = require('express-rate-limit');
const mongoose    = require('mongoose');
const { scanText, scanObject } = require('./safety');
const agent       = require('./agent');
const { Pokemon, GalleryItem, Post, User, PendingRequest, ActivityLog, Report, SocialToken, PublishJob, SiteConfig, TrainerProgress, Tip, Suggestion } = require('./models');
const { google } = require('googleapis');
const ffmpeg     = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET     = process.env.JWT_SECRET     || 'pokeball-secret-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pikachu123';
const MONGODB_URI    = process.env.MONGODB_URI    || '';
const YT_CLIENT_ID     = process.env.YT_CLIENT_ID     || '';
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET || '';
const APP_URL          = process.env.APP_URL          || 'https://jose-andres-pokemon.onrender.com';
const YT_REDIRECT      = `${APP_URL}/api/social/youtube/callback`;

async function getYTClient() {
  let clientId     = YT_CLIENT_ID;
  let clientSecret = YT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const [idDoc, secDoc] = await Promise.all([
      SiteConfig.findOne({ key: 'YT_CLIENT_ID' }),
      SiteConfig.findOne({ key: 'YT_CLIENT_SECRET' }),
    ]);
    clientId     = idDoc?.value     || '';
    clientSecret = secDoc?.value    || '';
  }
  return new google.auth.OAuth2(clientId, clientSecret, YT_REDIRECT);
}

// ── MongoDB connect ───────────────────────────────────────────────────────────
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('✅  MongoDB connected');
      seedJose();
      seedContent();
    })
    .catch(err => console.error('❌  MongoDB connection error:', err.message));
} else {
  console.warn('⚠️   MONGODB_URI not set — data will NOT persist across restarts.');
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please wait 15 minutes. 🔒' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp|mp4|webm|mov|avi/.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (ok) return cb(null, true);
    cb(Object.assign(new Error('Images and videos only!'), { status: 400 }));
  }
});

// ── Activity logger ───────────────────────────────────────────────────────────
async function logActivity({ type, userId, username, displayName, ip, detail, severity = 'info' }) {
  try {
    await ActivityLog.create({ type, userId: userId||null, username: username||'anonymous', displayName: displayName||'', ip, detail: detail||'', severity });
    // Keep only last 1000 logs
    const count = await ActivityLog.countDocuments();
    if (count > 1000) {
      const oldest = await ActivityLog.find().sort({ timestamp: 1 }).limit(count - 1000);
      await ActivityLog.deleteMany({ _id: { $in: oldest.map(l => l._id) } });
    }
  } catch (e) { console.error('logActivity error:', e.message); }
}

// ── Seed Jose's owner account ─────────────────────────────────────────────────
async function seedJose() {
  const exists = await User.findOne({ role: 'owner' });
  if (!exists) {
    await User.create({
      username: 'jose',
      displayName: 'Jose Andres',
      avatar: '⭐',
      color: '#FFCB05',
      role: 'owner',
      age: 6,
      passwordHash: await bcrypt.hash('jose123', 10),
    });
    console.log("✅  Jose's account seeded — jose / jose123");
  }
}

// ── Seed starter content (only if DB is empty) ────────────────────────────────
async function seedContent() {
  const postCount = await Post.countDocuments();
  if (postCount === 0) {
    await Post.insertMany([
      { title: 'I got my first Pokemon card pack today!! 🎉', body: "Daddy took me to the store and I got a Scarlet & Violet booster pack. I pulled a CHARIZARD EX!!! It's so shiny and cool. I'm never trading it. Never ever ever. 🔥", createdAt: new Date('2026-06-20T18:30:00Z') },
      { title: 'My favorite Pokemon is Pikachu ⚡', body: "I love Pikachu because he is Ash's best friend and he never gives up! I want a Pikachu backpack for school. Also Charizard is cool too but Pikachu is my NUMBER ONE. Ask Profesor Justin if you want to know more about Pikachu!", createdAt: new Date('2026-06-18T14:00:00Z') },
      { title: 'We went to Pokemon League at the game store! 🏆', body: "Papi brought me to the Pokemon League event at the card shop on Saturday. There were so many cards everywhere! I watched the big kids battle and it looked SO cool. I want to learn to play the card game. Profesor Justin is teaching me the rules!", createdAt: new Date('2026-06-15T20:00:00Z') },
    ]);
  }
  // One-time migration: rename PIKAFELLITO → Profesor Justin in existing posts
  const pikaflPosts = await Post.find({ body: /PIKAFELLITO/ });
  for (const p of pikaflPosts) {
    p.body = p.body.replace(/PIKAFELLITO/g, 'Profesor Justin');
    await p.save();
  }

  const pokCount = await Pokemon.countDocuments();
  if (pokCount === 0) {
    await Pokemon.insertMany([
      { name:'Pikachu',  type:'Electric', nickname:'Sparky', level:25, url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' },
      { name:'Charizard',type:'Fire',     nickname:'Blaze',  level:50, url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png' },
      { name:'Eevee',    type:'Normal',   nickname:'Cookie', level:12, url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png' },
      { name:'Gengar',   type:'Ghost',    nickname:'Spooky', level:36, url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png' },
      { name:'Mewtwo',   type:'Psychic',  nickname:'Boss',   level:70, url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png' },
      { name:'Togepi',   type:'Fairy',    nickname:'Eggie',  level:8,  url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/175.png' },
    ]);
  }
  const galCount = await GalleryItem.countDocuments();
  if (galCount === 0) {
    await GalleryItem.insertMany([
      { url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',  caption:'My Pikachu card — got this one from Grandma! ⚡', createdAt: new Date('2026-06-22T10:00:00Z') },
      { url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',   caption:'CHARIZARD EX I pulled from my booster pack!! 🔥🔥🔥', createdAt: new Date('2026-06-20T19:00:00Z') },
      { url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png', caption:"Eevee is the cutest Pokemon ever, don't @ me 🥺", createdAt: new Date('2026-06-19T15:30:00Z') },
      { url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png', caption:'Mewtwo — the most powerful Pokemon! Papi helped me get this one.', createdAt: new Date('2026-06-17T12:00:00Z') },
      { url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png',  caption:'Gengar is spooky but I love him 👻', createdAt: new Date('2026-06-14T20:00:00Z') },
      { url:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/175.png', caption:'Togepi is my baby 🥚 I named her Eggie', createdAt: new Date('2026-06-10T11:00:00Z') },
    ]);
  }
}

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

// requireUser — like requireToken but also fetches the full DB user document
async function requireUser(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Login required!' });
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Session expired — please log in again!' }); }
  const user = await User.findById(decoded.id).lean();
  if (!user) return res.status(401).json({ error: 'User not found.' });
  req.user = user;
  next();
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
}

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

app.get('/api/content', async (req, res) => {
  const [posts, pokemon, gallery] = await Promise.all([
    Post.find().sort({ createdAt: -1 }),
    Pokemon.find().sort({ createdAt: 1 }),
    GalleryItem.find().sort({ createdAt: -1 }),
  ]);
  res.json({ posts, pokemon, gallery, favoriteTeam: [] });
});

app.get('/api/friends', async (req, res) => {
  const users = await User.find({}, 'displayName avatar color role school');
  res.json(users);
});

// ── Login ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip   = getIP(req);
  const user = await User.findOne({ username: (username||'').toLowerCase().trim() });

  if (!user) {
    await logActivity({ type: 'login_fail', username, ip, detail: 'Unknown username', severity: 'warning' });
    return res.status(401).json({ error: "Who are you? Ask Jose's family to add you! 🤔" });
  }

  if (user.locked) {
    await logActivity({ type: 'login_locked', userId: user.id, username: user.username, displayName: user.displayName, ip, detail: 'Attempted login on locked account', severity: 'danger' });
    return res.status(403).json({ error: '🔒 This account is locked. Ask Jose\'s family for help.' });
  }

  const ok = await bcrypt.compare(password || '', user.passwordHash);

  if (!ok) {
    user.failedLogins = (user.failedLogins || 0) + 1;
    if (user.failedLogins >= 5) {
      user.locked = true;
      await user.save();
      await logActivity({ type: 'login_locked', userId: user.id, username: user.username, displayName: user.displayName, ip, detail: `Auto-locked after ${user.failedLogins} failed attempts`, severity: 'danger' });
      return res.status(403).json({ error: '🔒 Too many wrong codes! Account locked. Ask Jose\'s family for help.' });
    }
    await user.save();
    await logActivity({ type: 'login_fail', userId: user.id, username: user.username, displayName: user.displayName, ip, detail: `Wrong password (attempt ${user.failedLogins}/5)`, severity: 'warning' });
    return res.status(401).json({ error: `Wrong secret code! ${5 - user.failedLogins} tries left 🔑` });
  }

  user.failedLogins = 0;
  user.lastLogin = new Date();
  user.lastIP = ip;
  await user.save();
  await logActivity({ type: 'login_success', userId: user.id, username: user.username, displayName: user.displayName, ip, detail: 'Successful login', severity: 'info' });

  const token = jwt.sign(
    { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, color: user.color, role: user.role },
    JWT_SECRET, { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, displayName: user.displayName, avatar: user.avatar, color: user.color, role: user.role } });
});

// ── Session restore ───────────────────────────────────────────────────────────
app.get('/api/auth/me', requireToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.locked) return res.status(401).json({ error: 'Session invalid.' });
  res.json({ id: user.id, displayName: user.displayName, avatar: user.avatar, color: user.color, role: user.role });
});

// ── Account request ───────────────────────────────────────────────────────────
app.post('/api/auth/request-account', async (req, res) => {
  const ip = getIP(req);
  const { displayName, username, dob, school, parentName, parentEmail, parentConsent, selfConsent } = req.body;

  if (!displayName || !username || !dob)
    return res.status(400).json({ error: 'Please fill in all required fields.' });

  const scan = scanObject({ displayName, username, school: school||'', parentName: parentName||'' });
  if (!scan.safe) {
    await logActivity({ type: 'safety_flag', username, ip, detail: `Unsafe content in signup: ${scan.flags.join(', ')}`, severity: 'danger' });
    return res.status(400).json({ error: '🚨 Your request contains inappropriate content and has been flagged.' });
  }

  const age = calcAge(dob);
  if (age < 1 || age > 120) return res.status(400).json({ error: 'Please enter a valid date of birth.' });

  if (age < 13 && (!parentName || !parentEmail))
    return res.status(400).json({ error: 'Kids under 13 need a parent name and email.' });
  if (age < 13 && !parentConsent)
    return res.status(400).json({ error: 'A parent or guardian must check the consent box.' });
  if (age >= 13 && age < 18 && !selfConsent)
    return res.status(400).json({ error: 'You need to confirm a parent or guardian has given permission.' });

  const uname = username.toLowerCase().replace(/\s+/g, '');
  const existing = await User.findOne({ username: uname });
  if (existing) return res.status(409).json({ error: 'That username is taken! Try another.' });
  const pendingDup = await PendingRequest.findOne({ username: uname, status: 'pending' });
  if (pendingDup) return res.status(409).json({ error: 'A request with that username is already waiting.' });

  const suspiciousAdult = age >= 18;
  const request = await PendingRequest.create({
    displayName, username: uname, dob, age,
    school: school || '',
    parentName:    age < 13 ? (parentName  || '') : '',
    parentEmail:   age < 13 ? (parentEmail || '') : '',
    parentConsent: age < 13 ? !!parentConsent : null,
    selfConsent:   (age >= 13 && age < 18) ? !!selfConsent : null,
    flagged: suspiciousAdult,
    flagReason: suspiciousAdult ? 'Adult (18+) requesting access to a children\'s site' : '',
    ip,
  });

  await logActivity({ type: 'account_request', username: uname, ip, detail: `Account request: age ${age}${suspiciousAdult ? ' — ADULT, flagged' : ''}`, severity: suspiciousAdult ? 'danger' : 'info' });
  res.json({ ok: true });
});

// ── Profesor Justin ───────────────────────────────────────────────────────────
const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many messages! Take a breath and try again in a minute. 🌬️' }
});

app.post('/api/agent/chat', agentLimiter, async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !sessionId) return res.status(400).json({ error: 'Need a message and sessionId.' });
  if (message.length > 500) return res.status(400).json({ error: 'Message too long!' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'Agent not configured.' });

  try {
    const result = await agent.chat(sessionId, message);
    if (result.flagged) await logActivity({ type: 'safety_flag', ip: getIP(req), detail: `Agent blocked: "${message.slice(0,80)}"`, severity: 'warning' });
    res.json({ reply: result.reply });
  } catch (err) {
    console.error('Agent error:', err.message);
    res.status(500).json({ error: 'Profesor Justin is resting! Try again in a moment. 😴' });
  }
});

// ── Report button ─────────────────────────────────────────────────────────────
app.post('/api/report', async (req, res) => {
  const ip = getIP(req);
  const { reporterName, description, aboutUser } = req.body;
  if (!description) return res.status(400).json({ error: 'Please describe what happened.' });

  await Report.create({ reporterName: reporterName||'Anonymous', description, aboutUser: aboutUser||'', ip });
  await logActivity({ type: 'report', username: reporterName||'anonymous', ip, detail: `Report about: "${aboutUser||'unknown'}" — ${description.slice(0,80)}`, severity: 'danger' });
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  TRAINER HQ — leaderboard, trainer cards, tips & tricks
// ══════════════════════════════════════════════════════════════════════════════

// GET leaderboard + trainer cards (public)
app.get('/api/hq/leaderboard', async (req, res) => {
  const trainers = await TrainerProgress.find().sort({ badges: -1, caught: -1, hours: -1 });
  res.json(trainers);
});

// GET current user's trainer card (requires login)
app.get('/api/hq/me', requireUser, async (req, res) => {
  const card = await TrainerProgress.findOne({ userId: req.user._id });
  res.json(card || null);
});

// UPSERT current user's trainer card
app.post('/api/hq/me', requireUser, async (req, res) => {
  const { game, console: cons, badges, caught, hours, favoriteType, starterName, statusMsg } = req.body;
  if (badges > 99 || caught > 9999 || hours > 9999)
    return res.status(400).json({ error: 'Those numbers seem too big!' });

  const card = await TrainerProgress.findOneAndUpdate(
    { userId: req.user._id },
    {
      userId: req.user._id,
      username: req.user.username,
      displayName: req.user.displayName,
      avatar: req.user.avatar,
      color: req.user.color,
      game: (game || '').slice(0, 60),
      console: (cons || '').slice(0, 40),
      badges:  Math.max(0, Number(badges)  || 0),
      caught:  Math.max(0, Number(caught)  || 0),
      hours:   Math.max(0, Number(hours)   || 0),
      favoriteType: (favoriteType || '').slice(0, 30),
      starterName:  (starterName  || '').slice(0, 30),
      statusMsg:    (statusMsg    || '').slice(0, 100),
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
  res.json(card);
});

// GET all tips (public) — sorted by stars desc, newest as tiebreak
app.get('/api/hq/tips', async (req, res) => {
  const tips = await Tip.find().sort({ stars: -1, createdAt: -1 }).limit(50);
  res.json(tips);
});

// POST a new tip (requires login)
app.post('/api/hq/tips', requireUser, async (req, res) => {
  const { game, title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Need a title and tip!' });
  if (title.length > 80 || body.length > 500)
    return res.status(400).json({ error: 'Title or tip is too long!' });

  const tip = await Tip.create({
    userId: req.user._id,
    username: req.user.username,
    displayName: req.user.displayName,
    avatar: req.user.avatar,
    color: req.user.color,
    game: (game || 'Any Game').slice(0, 60),
    title: title.trim(),
    body:  body.trim(),
  });
  res.json(tip);
});

// POST star/unstar a tip (toggle)
app.post('/api/hq/tips/:id/star', requireUser, async (req, res) => {
  const tip = await Tip.findById(req.params.id);
  if (!tip) return res.status(404).json({ error: 'Tip not found' });

  const uid = req.user._id.toString();
  const alreadyStarred = tip.starredBy.map(id => id.toString()).includes(uid);

  if (alreadyStarred) {
    tip.starredBy = tip.starredBy.filter(id => id.toString() !== uid);
    tip.stars = Math.max(0, tip.stars - 1);
  } else {
    tip.starredBy.push(req.user._id);
    tip.stars += 1;
  }
  await tip.save();
  res.json({ stars: tip.stars, starred: !alreadyStarred });
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN API
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) res.json({ ok: true });
  else res.status(401).json({ error: 'Wrong password!' });
});

// ── Safety dashboard ──────────────────────────────────────────────────────────
app.get('/api/admin/safety', requireAdmin, async (req, res) => {
  const [openReports, dangerLogs, flaggedRequests, lockedAccounts, recentActivity] = await Promise.all([
    Report.find({ status: 'open' }),
    ActivityLog.find({ severity: 'danger' }).sort({ timestamp: -1 }).limit(50),
    PendingRequest.find({ flagged: true, status: 'pending' }),
    User.find({ locked: true }),
    ActivityLog.find().sort({ timestamp: -1 }).limit(100),
  ]);
  res.json({
    alerts: {
      openReports:     openReports.length,
      dangerLogs:      dangerLogs.length,
      flaggedRequests: flaggedRequests.length,
      lockedAccounts:  lockedAccounts.length,
    },
    openReports, dangerLogs, flaggedRequests, lockedAccounts, recentActivity
  });
});

app.post('/api/admin/reports/:id/close', requireAdmin, async (req, res) => {
  const r = await Report.findByIdAndUpdate(req.params.id, { status: 'closed', closedAt: new Date() });
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.post('/api/admin/friends/:id/lock', requireAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (user.role === 'owner') return res.status(403).json({ error: 'Cannot lock the owner account.' });
  user.locked = true;
  await user.save();
  await logActivity({ type: 'account_locked', username: user.username, displayName: user.displayName, ip: 'admin', detail: 'Locked by admin', severity: 'warning' });
  res.json({ ok: true });
});

app.post('/api/admin/friends/:id/unlock', requireAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.locked = false;
  user.failedLogins = 0;
  await user.save();
  await logActivity({ type: 'account_unlocked', username: user.username, displayName: user.displayName, ip: 'admin', detail: 'Unlocked by admin', severity: 'info' });
  res.json({ ok: true });
});

// ── Pending requests ──────────────────────────────────────────────────────────
app.get('/api/admin/requests', requireAdmin, async (req, res) => {
  const requests = await PendingRequest.find().sort({ createdAt: -1 });
  res.json({ requests });
});

app.post('/api/admin/requests/:id/approve', requireAdmin, async (req, res) => {
  const { password, avatar, color } = req.body;
  if (!password) return res.status(400).json({ error: 'Provide a starter password.' });

  const r = await PendingRequest.findById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found.' });
  if (r.status !== 'pending') return res.status(409).json({ error: 'Already processed.' });

  const exists = await User.findOne({ username: r.username });
  if (exists) return res.status(409).json({ error: 'Username exists.' });

  const AVATARS = ['🐱','🐶','🐸','🦊','🐼','🐨','🦁','🐯','🐺','🦝','🐻','🐮','🦄','🐙','🦋'];
  const newUser = await User.create({
    username: r.username,
    displayName: r.displayName,
    avatar: avatar || AVATARS[Math.floor(Math.random()*AVATARS.length)],
    color: color || '#3D7DCA',
    role: 'friend',
    school: r.school,
    age: r.age,
    passwordHash: await bcrypt.hash(password, 10),
  });

  r.status = 'approved';
  r.approvedAt = new Date();
  await r.save();
  await logActivity({ type: 'account_approved', username: r.username, displayName: r.displayName, ip: 'admin', detail: `Approved age ${r.age}`, severity: 'info' });
  const { passwordHash: _, ...safe } = newUser.toObject();
  res.json(safe);
});

app.post('/api/admin/requests/:id/deny', requireAdmin, async (req, res) => {
  const r = await PendingRequest.findById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found.' });
  r.status = 'denied';
  r.deniedAt = new Date();
  await r.save();
  await logActivity({ type: 'account_denied', username: r.username, ip: 'admin', detail: `Denied age ${r.age}`, severity: 'info' });
  res.json({ ok: true });
});

// ── Friends management ────────────────────────────────────────────────────────
app.get('/api/admin/friends', requireAdmin, async (req, res) => {
  const users = await User.find({}, '-passwordHash');
  res.json(users);
});

app.post('/api/admin/friends', requireAdmin, async (req, res) => {
  const { displayName, username, password, school, avatar, color, age } = req.body;
  if (!displayName || !username || !password) return res.status(400).json({ error: 'Need name, username and password.' });
  const scan = scanObject({ displayName, username, school: school||'' });
  if (!scan.safe) return res.status(400).json({ error: 'Name/username contains inappropriate content.' });

  const uname = username.toLowerCase().replace(/\s+/g, '');
  const exists = await User.findOne({ username: uname });
  if (exists) return res.status(409).json({ error: 'Username taken.' });

  const AVATARS = ['🐱','🐶','🐸','🦊','🐼','🐨','🦁','🐯','🐺','🦝','🐻','🐮','🦄','🐙','🦋'];
  const newUser = await User.create({
    username: uname, displayName,
    avatar: avatar || AVATARS[Math.floor(Math.random()*AVATARS.length)],
    color: color || '#3D7DCA',
    role: 'friend',
    school: school || '',
    age: age || null,
    passwordHash: await bcrypt.hash(password, 10),
  });
  const { passwordHash: _, ...safe } = newUser.toObject();
  res.json(safe);
});

app.delete('/api/admin/friends/:id', requireAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found.' });
  if (user.role === 'owner') return res.status(403).json({ error: "Can't remove Jose!" });
  await user.deleteOne();
  res.json({ ok: true });
});

app.put('/api/admin/friends/:id/password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Need a new password.' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found.' });
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  res.json({ ok: true });
});

// ── Content ───────────────────────────────────────────────────────────────────
app.post('/api/admin/gallery', requireAdmin, upload.single('image'), async (req, res) => {
  const url = req.file ? `/uploads/${req.file.filename}` : (req.body.url || '').trim();
  if (!url) return res.status(400).json({ error: 'Provide an image file or URL.' });
  const entry = await GalleryItem.create({ url, caption: req.body.caption||'' });
  res.json(entry);
});

app.delete('/api/admin/gallery/:id', requireAdmin, async (req, res) => {
  const item = await GalleryItem.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found.' });
  if (item.url.startsWith('/uploads/')) {
    const fp = path.join(__dirname, item.url.slice(1));
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  await item.deleteOne();
  res.json({ ok: true });
});

app.post('/api/admin/pokemon', requireAdmin, upload.single('image'), async (req, res) => {
  const imgUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.url || '').trim() || null;
  const entry = await Pokemon.create({
    name: req.body.name||'Unknown', type: req.body.type||'Normal',
    nickname: req.body.nickname||'', level: Number(req.body.level)||1, url: imgUrl
  });
  res.json(entry);
});

app.delete('/api/admin/pokemon/:id', requireAdmin, async (req, res) => {
  const p = await Pokemon.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found.' });
  await p.deleteOne();
  res.json({ ok: true });
});

app.post('/api/admin/posts', requireAdmin, upload.single('media'), async (req, res) => {
  const scan = scanObject({ title: req.body.title||'', body: req.body.body||'' });
  if (!scan.safe) return res.status(400).json({ error: 'Post contains inappropriate content.' });

  let mediaUrl = null, mediaType = null;
  if (req.file) {
    mediaUrl  = `/uploads/${req.file.filename}`;
    mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  } else if (req.body.mediaUrl) {
    mediaUrl  = req.body.mediaUrl.trim();
    mediaType = /\.(mp4|webm|mov|avi)$/i.test(mediaUrl) || mediaUrl.includes('youtube') || mediaUrl.includes('youtu.be') ? 'video' : 'image';
  }
  const entry = await Post.create({ title: req.body.title||'New Post', body: req.body.body||'', mediaUrl, mediaType });
  res.json(entry);
});

app.delete('/api/admin/posts/:id', requireAdmin, async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found.' });
  if (p.mediaUrl && p.mediaUrl.startsWith('/uploads/')) {
    const fp = path.join(__dirname, p.mediaUrl.slice(1));
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  await p.deleteOne();
  res.json({ ok: true });
});

// ── Studio AI ─────────────────────────────────────────────────────────────────
app.post('/api/studio/generate', requireAdmin, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });
  try {
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

// ── Editor AI Assistant ───────────────────────────────────────────────────────
app.post('/api/admin/editor/ai', requireAdmin, async (req, res) => {
  const { prompt, duration, currentSettings } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt' });
  try {
    let apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const doc = await SiteConfig.findOne({ key: 'ANTHROPIC_API_KEY' });
      apiKey = doc?.value || '';
    }
    if (!apiKey) return res.status(400).json({ error: 'No Anthropic API key configured. Add it in the API Keys section.' });

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a video editing assistant for a Pokemon website.
The user will describe what edits they want on a video.
You must respond ONLY with a valid JSON object (no markdown, no explanation) with these fields:
{
  "trimStart": <number seconds or null>,
  "trimEnd": <number seconds or null>,
  "overlayText": <string or "">,
  "overlayPosition": <"top"|"middle"|"bottom" or "bottom">,
  "overlayColor": <hex color string like "#ffffff">,
  "overlaySize": <number 12-120 or 48>,
  "message": <short friendly confirmation message in English>
}
Video duration: ${duration || 'unknown'} seconds.
Current settings: ${JSON.stringify(currentSettings || {})}.
Only change fields the user mentioned. Keep others at current values.`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].text.trim();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: text };
    }
    res.json(parsed);
  } catch(e) {
    console.error('Editor AI error:', e.message);
    res.status(500).json({ error: 'AI error: ' + e.message });
  }
});

// ── Video editor — trim + text overlay ───────────────────────────────────────
const editStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'raw');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `raw_${Date.now()}${path.extname(file.originalname)}`),
});
const editUpload = multer({ storage: editStorage, limits: { fileSize: 500 * 1024 * 1024 } });

app.post('/api/admin/editor/upload', requireAdmin, editUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ path: `/uploads/raw/${req.file.filename}`, filename: req.file.filename });
});

app.post('/api/admin/editor/process', requireAdmin, async (req, res) => {
  const { filename, startTime, endTime, overlayText, overlayPosition, overlayColor, overlaySize } = req.body;
  if (!filename) return res.status(400).json({ error: 'No filename' });

  const inputPath  = path.join(__dirname, 'uploads', 'raw', filename);
  const outName    = `edited_${Date.now()}.mp4`;
  const outputDir  = path.join(__dirname, 'uploads', 'edited');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outName);

  if (!fs.existsSync(inputPath)) return res.status(404).json({ error: 'Source file not found' });

  try {
    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath);

      // trim
      if (startTime !== undefined && startTime !== '') cmd = cmd.setStartTime(Number(startTime));
      if (endTime   !== undefined && endTime   !== '') cmd = cmd.setDuration(Number(endTime) - Number(startTime || 0));

      // text overlay
      if (overlayText && overlayText.trim()) {
        const pos = overlayPosition || 'bottom';
        const yMap = { top: '50', middle: '(h-text_h)/2', bottom: '(h-text_h-50)' };
        const y    = yMap[pos] || yMap.bottom;
        const color = (overlayColor || '#ffffff').replace('#', '');
        const size  = overlaySize || 48;
        const safeText = overlayText.replace(/'/g, "\\'").replace(/:/g, '\\:');
        cmd = cmd.videoFilters(
          `drawtext=text='${safeText}':fontsize=${size}:fontcolor=0x${color}:x=(w-text_w)/2:y=${y}:shadowcolor=black:shadowx=2:shadowy=2`
        );
      }

      cmd
        .outputOptions(['-c:v libx264', '-preset fast', '-crf 22', '-c:a aac', '-movflags +faststart'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    res.json({ url: `/uploads/edited/${outName}`, filename: outName });
  } catch (e) {
    console.error('FFmpeg error:', e.message);
    res.status(500).json({ error: 'Video processing failed: ' + e.message });
  }
});

// Extract thumbnail frame
app.post('/api/admin/editor/thumbnail', requireAdmin, async (req, res) => {
  const { filename, time } = req.body;
  if (!filename) return res.status(400).json({ error: 'No filename' });

  const inputPath = path.join(__dirname, 'uploads', 'raw', filename);
  const thumbName = `thumb_${Date.now()}.jpg`;
  const thumbDir  = path.join(__dirname, 'uploads', 'thumbs');
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(Number(time) || 0)
        .outputOptions(['-vframes 1', '-q:v 2'])
        .output(path.join(thumbDir, thumbName))
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    res.json({ url: `/uploads/thumbs/${thumbName}`, filename: thumbName });
  } catch (e) {
    res.status(500).json({ error: 'Thumbnail extraction failed: ' + e.message });
  }
});

app.use('/uploads/edited', express.static(path.join(__dirname, 'uploads', 'edited')));
app.use('/uploads/thumbs',  express.static(path.join(__dirname, 'uploads', 'thumbs')));

// ── Social — get connected accounts ──────────────────────────────────────────
app.get('/api/admin/social/status', requireAdmin, async (req, res) => {
  const tokens = await SocialToken.find({}, 'platform channelName avatarUrl connectedAt');
  const map = {};
  tokens.forEach(t => { map[t.platform] = { channelName: t.channelName, avatarUrl: t.avatarUrl, connectedAt: t.connectedAt }; });
  res.json(map);
});

app.delete('/api/admin/social/:platform', requireAdmin, async (req, res) => {
  await SocialToken.deleteOne({ platform: req.params.platform });
  res.json({ ok: true });
});

// ── Site Config (API keys stored in DB) ──────────────────────────────────────
app.get('/api/admin/config', requireAdmin, async (req, res) => {
  const docs = await SiteConfig.find({});
  const cfg  = {};
  docs.forEach(d => { cfg[d.key] = d.value; });
  res.json(cfg);
});

app.post('/api/admin/config', requireAdmin, async (req, res) => {
  const allowed = ['ANTHROPIC_API_KEY', 'YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'IG_CLIENT_ID', 'IG_CLIENT_SECRET', 'TT_CLIENT_KEY', 'TT_CLIENT_SECRET', 'FB_APP_ID', 'FB_APP_SECRET'];
  for (const [key, value] of Object.entries(req.body)) {
    if (!allowed.includes(key)) continue;
    await SiteConfig.findOneAndUpdate({ key }, { key, value, updatedAt: new Date() }, { upsert: true });
  }
  res.json({ ok: true });
});

// ── YouTube OAuth ─────────────────────────────────────────────────────────────
app.get('/api/social/youtube/connect', requireAdmin, async (req, res) => {
  const oauth2 = await getYTClient();
  const clientId = oauth2._clientId || oauth2.clientId_;
  if (!clientId) return res.status(400).send('<h2>YouTube not configured yet.</h2><p>Go to the Publish tab → API Keys and enter your Google OAuth credentials first.</p><a href="/admin#tab-publish">← Back to Admin</a>');
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/api/social/youtube/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.redirect('/admin?social_error=youtube_denied#tab-publish');
  try {
    const oauth2 = await getYTClient();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const yt = google.youtube({ version: 'v3', auth: oauth2 });
    const ch = await yt.channels.list({ part: ['snippet'], mine: true });
    const channel = ch.data.items?.[0];

    await SocialToken.findOneAndUpdate(
      { platform: 'youtube' },
      {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt:    tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        channelId:    channel?.id || null,
        channelName:  channel?.snippet?.title || 'YouTube Channel',
        avatarUrl:    channel?.snippet?.thumbnails?.default?.url || null,
      },
      { upsert: true, new: true }
    );

    res.redirect('/admin?social_success=youtube#tab-publish');
  } catch (e) {
    console.error('YouTube OAuth error:', e.message);
    res.redirect('/admin?social_error=youtube_failed#tab-publish');
  }
});

// ── Instagram / TikTok / Facebook — placeholder connect (OAuth setup needed) ─
// These need developer app registration — UI shows instructions when clicked
app.get('/api/social/:platform/connect', requireAdmin, (req, res) => {
  const p = req.params.platform;
  res.status(501).json({
    error: `${p} OAuth not yet configured`,
    setup: `Add ${p.toUpperCase()}_CLIENT_ID and ${p.toUpperCase()}_CLIENT_SECRET to Render env vars to enable`,
  });
});

// ── Publish to all platforms ──────────────────────────────────────────────────
app.post('/api/admin/publish', requireAdmin, async (req, res) => {
  const { title, description, videoFilename, thumbFilename, platforms, postToSite, postTitle, postBody } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const job = await PublishJob.create({
    title, description,
    videoPath: videoFilename ? `/uploads/edited/${videoFilename}` : null,
    thumbPath: thumbFilename ? `/uploads/thumbs/${thumbFilename}`  : null,
    platforms: platforms || [],
    status: 'running',
  });

  const results = {};
  const errors  = {};

  // ── Post to Jose's site ──
  if (postToSite) {
    try {
      const entry = await Post.create({
        title: postTitle || title,
        body:  postBody  || description,
        mediaUrl:  videoFilename ? `/uploads/edited/${videoFilename}` : null,
        mediaType: videoFilename ? 'video' : null,
      });
      results.site = { ok: true, id: entry._id };
    } catch (e) {
      errors.site = e.message;
    }
  }

  // ── Post to YouTube ──
  if ((platforms || []).includes('youtube')) {
    try {
      const tokenDoc = await SocialToken.findOne({ platform: 'youtube' });
      if (!tokenDoc) throw new Error('YouTube not connected');

      const oauth2 = await getYTClient();
      oauth2.setCredentials({
        access_token:  tokenDoc.accessToken,
        refresh_token: tokenDoc.refreshToken,
        expiry_date:   tokenDoc.expiresAt?.getTime(),
      });

      const videoPath = path.join(__dirname, 'uploads', 'edited', videoFilename);
      if (!fs.existsSync(videoPath)) throw new Error('Video file not found');

      const yt = google.youtube({ version: 'v3', auth: oauth2 });

      const uploadParams = {
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            tags: ['Pokemon', 'JoseAndres', 'Pokemon Cards', 'Kids Pokemon'],
            categoryId: '20',
            defaultLanguage: 'es',
          },
          status: { privacyStatus: 'public' },
        },
        media: { body: fs.createReadStream(videoPath) },
      };

      if (thumbFilename) {
        const ytRes = await yt.videos.insert(uploadParams);
        const videoId = ytRes.data.id;
        const thumbPath = path.join(__dirname, 'uploads', 'thumbs', thumbFilename);
        if (fs.existsSync(thumbPath)) {
          await yt.thumbnails.set({
            videoId,
            media: { mimeType: 'image/jpeg', body: fs.createReadStream(thumbPath) },
          });
        }
        results.youtube = { ok: true, videoId, url: `https://youtu.be/${videoId}` };
      } else {
        const ytRes = await yt.videos.insert(uploadParams);
        results.youtube = { ok: true, videoId: ytRes.data.id, url: `https://youtu.be/${ytRes.data.id}` };
      }

      // refresh stored token if rotated
      const newCreds = oauth2.credentials;
      if (newCreds.access_token !== tokenDoc.accessToken) {
        await SocialToken.updateOne({ platform: 'youtube' }, { accessToken: newCreds.access_token });
      }
    } catch (e) {
      errors.youtube = e.message;
    }
  }

  // ── Instagram / TikTok / Facebook — queue for when OAuth is configured ──
  ['instagram', 'tiktok', 'facebook'].forEach(p => {
    if ((platforms || []).includes(p)) {
      errors[p] = `${p} posting requires OAuth setup — connect the account first`;
    }
  });

  const status = Object.keys(errors).length === 0 ? 'done' : (Object.keys(results).length > 0 ? 'partial' : 'failed');
  await PublishJob.findByIdAndUpdate(job._id, { results, status });

  res.json({ ok: true, jobId: job._id, results, errors, status });
});

// ── Publish history ───────────────────────────────────────────────────────────
app.get('/api/admin/publish/history', requireAdmin, async (req, res) => {
  const jobs = await PublishJob.find().sort({ createdAt: -1 }).limit(20);
  res.json(jobs);
});

// ── Suggestions (Justin → Fellito) ────────────────────────────────────────────
app.post('/api/admin/suggestions', requireAdmin, async (req, res) => {
  const { from, title, body, category, priority } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  const s = await Suggestion.create({ from: from || 'Justin', title, body, category, priority });
  res.json(s);
});

app.get('/api/admin/suggestions', requireAdmin, async (req, res) => {
  const suggestions = await Suggestion.find().sort({ createdAt: -1 });
  res.json(suggestions);
});

app.patch('/api/admin/suggestions/:id/read', requireAdmin, async (req, res) => {
  await Suggestion.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ ok: true });
});

app.delete('/api/admin/suggestions/:id', requireAdmin, async (req, res) => {
  await Suggestion.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n🔴  Site   → http://localhost:${PORT}`);
  console.log(`🛡️   Admin  → http://localhost:${PORT}/admin`);
  console.log(`🔑  Admin password : ${ADMIN_PASSWORD}`);
  console.log(`👤  Jose login     : jose / jose123\n`);
});
