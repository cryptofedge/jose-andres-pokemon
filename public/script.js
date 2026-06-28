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

// ── Boot ──────────────────────────────────────────────────────────
loadContent();
