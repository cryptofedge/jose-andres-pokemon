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
  container.innerHTML = list.map(post => `
    <div class="post-card fade-in">
      <div class="post-date">${new Date(post.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</div>
      <div class="post-title">${post.title}</div>
      <div class="post-body">${post.body}</div>
    </div>
  `).join('');
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
}

function logout() {
  clearToken();
  currentUser = null;
  document.getElementById('header-user').classList.add('hidden');
  document.getElementById('btn-login').classList.remove('hidden');
}

// ── Modal system ──────────────────────────────────────────────────
function openModal(type) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  ['login','signup','report'].forEach(t => {
    document.getElementById(`modal-${t}`).classList.add('hidden');
  });
  document.getElementById(`modal-${type}`).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  ['login','signup','report'].forEach(t => document.getElementById(`modal-${t}`).classList.add('hidden'));
  document.body.style.overflow = '';
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
  document.getElementById('agent-toggle-icon').textContent = agentOpen ? '✕' : '⚡';
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

// ── Boot ──────────────────────────────────────────────────────────
loadContent();
