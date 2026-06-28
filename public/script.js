// ── Loader ────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('done');
  }, 1200);
});

// ── Mobile nav ────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mainNav   = document.getElementById('main-nav');
const overlay   = document.getElementById('nav-overlay');

hamburger.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  hamburger.classList.toggle('open', open);
  overlay.classList.toggle('show', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

function closeNav() {
  mainNav.classList.remove('open');
  hamburger.classList.remove('open');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

// Close nav on resize back to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 680) closeNav();
});

// ── Type emoji map ────────────────────────────────────────────────
const typeEmoji = {
  fire:'🔥', water:'💧', grass:'🌿', electric:'⚡', psychic:'🔮',
  ice:'❄️', dragon:'🐉', dark:'🌑', fighting:'🥊', poison:'☠️',
  ground:'🏔️', flying:'🕊️', bug:'🐛', rock:'🪨', ghost:'👻',
  steel:'⚙️', fairy:'✨', normal:'⭐'
};

// ── Fetch & render ────────────────────────────────────────────────
async function loadContent() {
  let data;
  try {
    const res = await fetch('/api/content');
    data = await res.json();
  } catch {
    // Running without backend — show empty states
    data = { posts: [], pokemon: [], gallery: [], favoriteTeam: [] };
  }

  renderStats(data);
  renderPokemon(data.pokemon || []);
  renderGallery(data.gallery || []);
  renderPosts(data.posts || []);
}

function renderStats(data) {
  document.getElementById('pokemon-count').textContent = (data.pokemon || []).length;
  document.getElementById('gallery-count').textContent  = (data.gallery || []).length;
  document.getElementById('post-count').textContent     = (data.posts   || []).length;
}

// ── Pokemon ───────────────────────────────────────────────────────
function renderPokemon(list) {
  const grid = document.getElementById('pokemon-grid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="pokeball-empty"></div>
      <p>No Pokemon yet… check back soon!</p>
    </div>`;
    return;
  }
  grid.innerHTML = list.map(p => pokemonCard(p)).join('');
  grid.querySelectorAll('.poke-card').forEach((el, i) => {
    el.style.animationDelay = `${i * 0.08}s`;
    el.classList.add('fade-in');
  });
}

function pokemonCard(p) {
  const type = (p.type || 'normal').toLowerCase();
  const emoji = typeEmoji[type] || '⭐';
  const imgTag = p.url
    ? `<img class="poke-img" src="${p.url}" alt="${p.name}" />`
    : `<div class="poke-img-placeholder">${emoji}</div>`;

  return `<div class="poke-card">
    ${imgTag}
    <div class="poke-name">${p.name.toUpperCase()}</div>
    ${p.nickname ? `<div class="poke-nickname">"${p.nickname}"</div>` : ''}
    <span class="poke-type type-${type}">${emoji} ${p.type}</span>
    <div class="poke-level">Lv. ${p.level || 1}</div>
  </div>`;
}

// ── Gallery ───────────────────────────────────────────────────────
function renderGallery(list) {
  const grid = document.getElementById('gallery-grid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><p>No photos yet!</p></div>`;
    return;
  }
  grid.innerHTML = list.map(g => `
    <div class="gallery-item" data-url="${g.url}" data-caption="${g.caption || ''}">
      <img src="${g.url}" alt="${g.caption || 'Photo'}" loading="lazy" />
      ${g.caption ? `<div class="gallery-caption">${g.caption}</div>` : ''}
    </div>
  `).join('');

  grid.querySelectorAll('.gallery-item').forEach(el => {
    el.addEventListener('click', () => openLightbox(el.dataset.url, el.dataset.caption));
  });
}

function openLightbox(url, caption) {
  document.getElementById('lb-img').src = url;
  document.getElementById('lb-caption').textContent = caption || '';
  document.getElementById('lightbox').classList.remove('hidden');
}

document.getElementById('lb-close').addEventListener('click', () => {
  document.getElementById('lightbox').classList.add('hidden');
});

document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});

// ── Posts ─────────────────────────────────────────────────────────
function renderPosts(list) {
  const container = document.getElementById('posts-list');
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><p>No updates yet!</p></div>`;
    return;
  }
  container.innerHTML = list.map(post => {
    let mediaHtml = '';
    if (post.mediaUrl) {
      if (post.mediaType === 'video') {
        const ytMatch = post.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
        if (ytMatch) {
          mediaHtml = `<div class="post-media"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:12px;margin-top:12px"></iframe></div>`;
        } else {
          mediaHtml = `<div class="post-media"><video src="${post.mediaUrl}" controls style="width:100%;max-height:320px;border-radius:12px;margin-top:12px"></video></div>`;
        }
      } else {
        mediaHtml = `<div class="post-media"><img src="${post.mediaUrl}" alt="${post.title}" style="width:100%;max-height:320px;object-fit:cover;border-radius:12px;margin-top:12px;cursor:pointer" onclick="openLightbox(this.src,'${post.title}')" /></div>`;
      }
    }
    return `
    <div class="post-card fade-in">
      <div class="post-date">${new Date(post.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</div>
      <div class="post-title">${post.title}</div>
      <div class="post-body">${post.body}</div>
      ${mediaHtml}
    </div>`;
  }).join('');
}

// ── Auth state ────────────────────────────────────────────────────
let currentUser = null;

function getToken() { return localStorage.getItem('poke_token'); }
function setToken(t) { localStorage.setItem('poke_token', t); }
function clearToken() { localStorage.removeItem('poke_token'); }

// Restore session on load
(async function restoreSession() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const user = await res.json();
      setLoggedIn(user);
    } else {
      clearToken();
    }
  } catch { clearToken(); }
})();

function setLoggedIn(user) {
  currentUser = user;
  document.getElementById('header-avatar').textContent = user.avatar;
  document.getElementById('header-name').textContent   = user.displayName;
  document.getElementById('header-user').classList.remove('hidden');
  document.getElementById('btn-login').classList.add('hidden');
  document.getElementById('hq-update-wrap')?.classList.remove('hidden');
  document.getElementById('hq-add-tip-btn-wrap')?.classList.remove('hidden');
  loadMyTrainerCard();
}

function logout() {
  clearToken();
  currentUser = null;
  document.getElementById('header-user').classList.add('hidden');
  document.getElementById('btn-login').classList.remove('hidden');
  document.getElementById('hq-update-wrap')?.classList.add('hidden');
  document.getElementById('hq-add-tip-btn-wrap')?.classList.add('hidden');
}

// ── Modal system ──────────────────────────────────────────────────
function openModal(type) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  ['login','signup','report','invite','hq'].forEach(t => {
    document.getElementById(`modal-${t}`)?.classList.add('hidden');
  });
  document.getElementById(`modal-${type}`)?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  ['login','signup','report','invite','hq'].forEach(t => document.getElementById(`modal-${t}`)?.classList.add('hidden'));
  document.body.style.overflow = '';
}

function showSignupStep(step) {
  ['step-1','under13','teen','adult','success'].forEach(s => {
    const el = document.getElementById(`signup-${s}`);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(`signup-${step}`);
  if (target) target.classList.remove('hidden');
}

// ── Lang picker init ──────────────────────────────────────────────
function buildLangPicker() {
  const picker = document.getElementById('lang-picker');
  if (!picker) return;
  picker.innerHTML = Object.entries(LANGS).map(([code, info]) =>
    `<button class="lang-opt${code === currentLang ? ' active' : ''}" data-lang="${code}">${info.flag} ${info.label}</button>`
  ).join('');
  // Use event listeners with stopPropagation so document handler can't race on mobile
  picker.querySelectorAll('.lang-opt').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setLang(btn.dataset.lang);
    });
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      e.stopPropagation();
      setLang(btn.dataset.lang);
    });
  });
}

function previewID(input, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview || !input.files[0]) return;
  const file = input.files[0];
  const icon = file.type.startsWith('image/') ? '🖼️' : '📄';
  preview.innerHTML = `<span class="id-upload-icon">${icon}</span><span class="id-upload-txt" style="color:var(--yellow)">${file.name}</span><span style="font-size:11px;color:rgba(255,255,255,0.5)">${(file.size/1024).toFixed(0)} KB</span>`;
}

function checkInviteCode() {
  const code  = (document.getElementById('invite-code').value || '').trim().toUpperCase();
  const err   = document.getElementById('invite-error');
  if (!code) { err.textContent = 'Please enter your invite code.'; err.classList.remove('hidden'); return; }
  if (code !== 'POKEFAM25') {
    err.textContent = '❌ That code is not valid. Ask Jose\'s family for the invite code!';
    err.classList.remove('hidden');
    document.getElementById('invite-code').value = '';
    return;
  }
  // Valid — send them to signup flow
  err.classList.add('hidden');
  document.getElementById('invite-code').value = '';
  openModal('signup');
}

document.getElementById('modal-overlay').addEventListener('click', closeModal);

// ── Login ─────────────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.classList.add('hidden');

  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error;
      errEl.classList.remove('hidden');
      return;
    }
    setToken(data.token);
    setLoggedIn(data.user);
    closeModal();
    showWelcome(data.user);
  } catch {
    errEl.textContent = 'Could not connect to server.';
    errEl.classList.remove('hidden');
  }
}

document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function showWelcome(user) {
  const isOwner = user.role === 'owner';
  document.getElementById('wb-avatar').textContent = user.avatar;
  document.getElementById('wb-msg').textContent =
    isOwner
      ? `Welcome back, ${user.displayName}! ⭐ It's your world!`
      : `Hey ${user.displayName}! 🎉 Welcome to Jose's Pokemon World!`;
  document.getElementById('welcome-banner').classList.remove('hidden');
  setTimeout(dismissWelcome, 5000);
}

function dismissWelcome() {
  document.getElementById('welcome-banner').classList.add('hidden');
}

// ── Sign-up / Request account ─────────────────────────────────────
// Set max DOB date to today
document.getElementById('signup-dob').max = new Date().toISOString().split('T')[0];

function checkAge() {
  const dob = document.getElementById('signup-dob').value;
  const errEl = document.getElementById('dob-error');
  errEl.classList.add('hidden');

  if (!dob) {
    errEl.textContent = 'Please enter your date of birth.';
    errEl.classList.remove('hidden');
    return;
  }

  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  if (age < 1 || age > 120) {
    errEl.textContent = 'Please enter a valid date of birth.';
    errEl.classList.remove('hidden');
    return;
  }

  // Hide step 1, show correct flow
  document.getElementById('signup-step-1').classList.add('hidden');
  if (age < 13)       document.getElementById('signup-under13').classList.remove('hidden');
  else if (age < 18)  document.getElementById('signup-teen').classList.remove('hidden');
  else                document.getElementById('signup-adult').classList.remove('hidden');
}

async function submitRequest(group) {
  const dob = document.getElementById('signup-dob').value;
  let body = { dob };
  let errId;

  if (group === 'under13') {
    errId = 'su13-error';
    body = { ...body,
      displayName:   document.getElementById('su13-name').value.trim(),
      username:      document.getElementById('su13-username').value.trim(),
      school:        document.getElementById('su13-school').value.trim(),
      parentName:    document.getElementById('su13-parentname').value.trim(),
      parentEmail:   document.getElementById('su13-parentemail').value.trim(),
      parentConsent: document.getElementById('su13-consent').checked,
    };
  } else if (group === 'teen') {
    errId = 'suteen-error';
    body = { ...body,
      displayName: document.getElementById('suteen-name').value.trim(),
      username:    document.getElementById('suteen-username').value.trim(),
      school:      document.getElementById('suteen-school').value.trim(),
      selfConsent: document.getElementById('suteen-consent').checked,
    };
  } else {
    errId = 'suadult-error';
    body = { ...body,
      displayName: document.getElementById('suadult-name').value.trim(),
      username:    document.getElementById('suadult-username').value.trim(),
      school:      document.getElementById('suadult-school').value.trim(),
    };
  }

  const errEl = document.getElementById(errId);
  errEl.classList.add('hidden');

  try {
    const res  = await fetch('/api/auth/request-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error;
      errEl.classList.remove('hidden');
      return;
    }
    // Show success
    ['signup-under13','signup-teen','signup-adult'].forEach(id =>
      document.getElementById(id).classList.add('hidden')
    );
    document.getElementById('signup-success').classList.remove('hidden');
  } catch {
    errEl.textContent = 'Could not connect to server. Try again later.';
    errEl.classList.remove('hidden');
  }
}

// ── Report ────────────────────────────────────────────────────────
async function submitReport() {
  const desc  = document.getElementById('rpt-desc').value.trim();
  const errEl = document.getElementById('rpt-error');
  errEl.classList.add('hidden');

  if (!desc) {
    errEl.textContent = 'Please describe what happened.';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporterName: document.getElementById('rpt-name').value.trim(),
        aboutUser:    document.getElementById('rpt-about').value.trim(),
        description:  desc
      })
    });
    if (res.ok) {
      closeModal();
      alert('✅ Your report was sent to Jose\'s family. Thank you for staying safe! 💛');
    }
  } catch {
    errEl.textContent = 'Could not send report. Please tell a trusted adult directly.';
    errEl.classList.remove('hidden');
  }
}

// ── PIKAFELLITO Agent ───────────────────────────────────────────────
const agentSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
let agentOpen = false;

function toggleAgent() {
  agentOpen = !agentOpen;
  document.getElementById('agent-panel').classList.toggle('hidden', !agentOpen);
  document.getElementById('agent-toggle-icon').textContent = agentOpen ? '✕' : '🎓';
  if (agentOpen) {
    setTimeout(() => document.getElementById('agent-input').focus(), 100);
    scrollAgentToBottom();
  }
}

function scrollAgentToBottom() {
  const el = document.getElementById('agent-messages');
  el.scrollTop = el.scrollHeight;
}

function appendMsg(role, text) {
  const messages = document.getElementById('agent-messages');
  const div = document.createElement('div');
  div.className = `agent-msg ${role}`;
  const avatar = role === 'bot' ? '⚡' : (currentUser ? currentUser.avatar : '👤');
  div.innerHTML = `
    <span class="msg-avatar">${avatar}</span>
    <div class="msg-bubble">${text}</div>
  `;
  messages.appendChild(div);
  scrollAgentToBottom();
  return div;
}

async function sendAgentMsg() {
  const input = document.getElementById('agent-input');
  const msg   = input.value.trim();
  if (!msg) return;
  input.value = '';

  appendMsg('user', msg);

  // Typing indicator
  const typing = appendMsg('bot typing', '');
  typing.classList.add('typing');

  try {
    const res  = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, sessionId: agentSessionId })
    });
    const data = await res.json();
    typing.remove();

    if (!res.ok) {
      appendMsg('bot', data.error || 'Oops! Try again! ⚡');
    } else {
      appendMsg('bot', data.reply);
    }
  } catch {
    typing.remove();
    appendMsg('bot', "Pika! I can't connect right now. Try again! ⚡");
  }
}

// ══════════════════════════════════════════════════════════════════
// ── TRAINER HQ ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

const CONSOLE_ICONS = {
  'Switch': '🎮', 'Nintendo Switch': '🎮',
  '3DS': '🎮', 'DS': '🎮', 'GBA': '🎮',
  'Mobile': '📱', 'Other': '🕹️'
};

function switchHQTab(tab, btn) {
  document.querySelectorAll('.hq-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('hq-tab-leaderboard').classList.toggle('hidden', tab !== 'leaderboard');
  document.getElementById('hq-tab-tips').classList.toggle('hidden', tab !== 'tips');
}

// ── Leaderboard ────────────────────────────────────────────────────
async function loadLeaderboard() {
  try {
    const res  = await fetch('/api/hq/leaderboard');
    const list = await res.json();
    const el   = document.getElementById('leaderboard-list');
    if (!list.length) {
      el.innerHTML = '<div class="empty-state"><p>No trainers yet — be the first! 🎮</p></div>';
      return;
    }
    const rankLabels = ['🥇','🥈','🥉'];
    const rankClass  = ['gold','silver','bronze'];
    el.innerHTML = list.map((t, i) => {
      const rank = i < 3 ? `<span class="trainer-rank ${rankClass[i]}">${rankLabels[i]}</span>`
                         : `<span class="trainer-rank">#${i+1}</span>`;
      const game = t.game || 'No game set';
      const status = t.statusMsg ? `<div class="trainer-status">"${t.statusMsg}"</div>` : '';
      const starter = t.starterName ? ` · Starter: ${t.starterName}` : '';
      const favtype = t.favoriteType ? ` · Fav: ${t.favoriteType}` : '';
      return `
        <div class="trainer-card${i < 3 ? ' rank-'+(i+1) : ''}">
          ${rank}
          <div class="trainer-info">
            <div class="trainer-name-row">
              <span class="trainer-avatar">${t.avatar || '🎮'}</span>
              <span class="trainer-name" style="color:${t.color||'#fff'}">${t.displayName}</span>
            </div>
            <div class="trainer-game">🎮 ${game}${starter}${favtype}</div>
            ${status}
          </div>
          <div class="trainer-stats">
            <div class="trainer-stat">🏅 <strong>${t.badges}</strong> badges</div>
            <div class="trainer-stat">🔴 <strong>${t.caught}</strong> caught</div>
            <div class="trainer-stat">⏱ <strong>${t.hours}</strong> hrs</div>
          </div>
        </div>`;
    }).join('');
  } catch { /* silent */ }
}

// ── My trainer card — pre-fill modal ──────────────────────────────
async function loadMyTrainerCard() {
  try {
    const res = await fetch('/api/hq/me', { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const card = await res.json();
    if (!card) return;
    document.getElementById('hq-game').value    = card.game || '';
    document.getElementById('hq-badges').value  = card.badges ?? '';
    document.getElementById('hq-caught').value  = card.caught ?? '';
    document.getElementById('hq-hours').value   = card.hours  ?? '';
    document.getElementById('hq-starter').value = card.starterName || '';
    document.getElementById('hq-favtype').value = card.favoriteType || '';
    document.getElementById('hq-status').value  = card.statusMsg || '';
  } catch { /* silent */ }
}

function openHQModal() { openModal('hq'); }

async function saveTrainerCard() {
  const errEl = document.getElementById('hq-error');
  errEl.classList.add('hidden');
  const body = {
    game:        document.getElementById('hq-game').value,
    badges:      document.getElementById('hq-badges').value,
    caught:      document.getElementById('hq-caught').value,
    hours:       document.getElementById('hq-hours').value,
    starterName: document.getElementById('hq-starter').value.trim(),
    favoriteType:document.getElementById('hq-favtype').value,
    statusMsg:   document.getElementById('hq-status').value.trim(),
  };
  try {
    const res = await fetch('/api/hq/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; errEl.classList.remove('hidden'); return; }
    closeModal();
    loadLeaderboard();
  } catch {
    errEl.textContent = 'Could not save. Try again!';
    errEl.classList.remove('hidden');
  }
}

// ── Tips ──────────────────────────────────────────────────────────
let myStarredTips = new Set();

async function loadTips() {
  try {
    const res  = await fetch('/api/hq/tips');
    const tips = await res.json();
    const el   = document.getElementById('tips-list');
    if (!tips.length) {
      el.innerHTML = '<div class="empty-state"><p>No tips yet — be the first to share! 💡</p></div>';
      return;
    }
    const uid = currentUser?.id;
    el.innerHTML = tips.map(t => {
      const starred = uid && t.starredBy?.includes(uid);
      if (starred) myStarredTips.add(t._id);
      return `
        <div class="tip-card" id="tip-${t._id}">
          <div class="tip-header">
            <span class="tip-avatar">${t.avatar || '🎮'}</span>
            <div class="tip-meta">
              <div class="tip-author" style="color:${t.color||'#fff'}">${t.displayName}</div>
              <div class="tip-game">${t.game}</div>
            </div>
            <button class="tip-star-btn${starred?' starred':''}" onclick="starTip('${t._id}', this)">
              ⭐ ${t.stars}
            </button>
          </div>
          <div class="tip-title">${t.title}</div>
          <div class="tip-body">${t.body}</div>
        </div>`;
    }).join('');
  } catch { /* silent */ }
}

async function starTip(id, btn) {
  if (!currentUser) { openModal('login'); return; }
  try {
    const res  = await fetch(`/api/hq/tips/${id}/star`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (res.ok) {
      btn.textContent = `⭐ ${data.stars}`;
      btn.classList.toggle('starred', data.starred);
    }
  } catch { /* silent */ }
}

function showTipForm() {
  document.getElementById('hq-tip-form-wrap').classList.remove('hidden');
  document.getElementById('hq-add-tip-btn-wrap').classList.add('hidden');
}

function cancelTip() {
  document.getElementById('hq-tip-form-wrap').classList.add('hidden');
  document.getElementById('hq-add-tip-btn-wrap').classList.remove('hidden');
  document.getElementById('tip-error').classList.add('hidden');
}

async function submitTip() {
  const errEl = document.getElementById('tip-error');
  errEl.classList.add('hidden');
  const body = {
    game:  document.getElementById('tip-game').value,
    title: document.getElementById('tip-title').value.trim(),
    body:  document.getElementById('tip-body').value.trim(),
  };
  if (!body.title || !body.body) {
    errEl.textContent = 'Please fill in the title and tip!';
    errEl.classList.remove('hidden');
    return;
  }
  try {
    const res = await fetch('/api/hq/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; errEl.classList.remove('hidden'); return; }
    document.getElementById('tip-title').value = '';
    document.getElementById('tip-body').value  = '';
    cancelTip();
    loadTips();
  } catch {
    errEl.textContent = 'Could not post tip. Try again!';
    errEl.classList.remove('hidden');
  }
}

// ── Boot ──────────────────────────────────────────────────────────
buildLangPicker();
applyLang();
loadContent();
loadLeaderboard();
loadTips();
