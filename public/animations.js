// ═══════════════════════════════════════════════════════════════════
// JOSE ANDRES' POKEMON WORLD — Visual Animations
// FEDGE 2.O · Eclat Universe
// ═══════════════════════════════════════════════════════════════════

'use strict';

// ── 1. Floating Pokéball Particle Canvas ────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let W, H;
  const isMobile = window.matchMedia('(max-width: 680px)').matches;
  const COUNT = isMobile ? 14 : 28;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkParticle(forced) {
    const r = Math.random() * 36 + 10;
    return {
      x:  forced ? -r * 2 : Math.random() * W,
      y:  Math.random() * H,
      r,
      vx: Math.random() * 0.35 + 0.05,
      vy: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.08 + 0.02,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.005,
    };
  }

  const particles = [];
  resize();
  for (let i = 0; i < COUNT; i++) particles.push(mkParticle(false));
  window.addEventListener('resize', resize, { passive: true });

  // Subtle parallax on mouse move
  let parallaxX = 0, parallaxY = 0;
  document.addEventListener('mousemove', e => {
    parallaxX = (e.clientX / W - 0.5) * 0.15;
    parallaxY = (e.clientY / H - 0.5) * 0.1;
  }, { passive: true });

  function drawPokeball(p) {
    const { x, y, r, rot, opacity } = p;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = opacity;

    // Outer circle clip
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    // Top half — red
    ctx.fillStyle = `rgba(238,21,21,1)`;
    ctx.fillRect(-r, -r, r * 2, r);

    // Bottom half — white
    ctx.fillStyle = `rgba(230,230,230,1)`;
    ctx.fillRect(-r, 0, r * 2, r);

    // Band
    ctx.fillStyle = `rgba(20,20,20,1)`;
    ctx.fillRect(-r, -r * 0.1, r * 2, r * 0.2);

    // Center button
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,200,200,1)`;
    ctx.fill();
    ctx.lineWidth = r * 0.08;
    ctx.strokeStyle = `rgba(20,20,20,1)`;
    ctx.stroke();

    // Outer ring stroke
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = `rgba(20,20,20,1)`;
    ctx.stroke();

    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x   += p.vx + parallaxX;
      p.y   += p.vy + parallaxY;
      p.rot += p.rotV;
      if (p.x > W + p.r * 2) { p.x = -p.r * 2; p.y = Math.random() * H; }
      if (p.y < -p.r * 2)    p.y = H + p.r * 2;
      if (p.y > H + p.r * 2) p.y = -p.r * 2;
      drawPokeball(p);
    });
    requestAnimationFrame(tick);
  }
  tick();
})();


// ── 2. Stat Counter Roll Animation ─────────────────────────────────
function animateCounter(el, target, duration) {
  if (!el || !target) return;
  duration = duration || 1200;
  const startTime = performance.now();
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function frame(now) {
    const t = Math.min(1, (now - startTime) / duration);
    el.textContent = Math.round(easeOut(t) * target);
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = target;
  }
  requestAnimationFrame(frame);
}

// Called by script.js renderStats
window.triggerCounters = function(pokemon, gallery, posts) {
  setTimeout(function() {
    animateCounter(document.getElementById('pokemon-count'), pokemon, 1000);
    animateCounter(document.getElementById('gallery-count'), gallery, 1200);
    animateCounter(document.getElementById('post-count'),    posts,   1400);
  }, 700);
};


// ── 3. Holographic + Mouse-tracking Radial on Pokemon Cards ────────
function attachCardEffect(card) {
  card.addEventListener('mousemove', function(e) {
    const rect = card.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1) + '%';
    const my = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%';
    const dx = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
    const dy = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
    const angle = (Math.atan2(dy, dx) * (180 / Math.PI) + 90 + 360) % 360;

    card.style.setProperty('--mouse-x',     mx);
    card.style.setProperty('--mouse-y',     my);
    card.style.setProperty('--holo-angle',  angle + 'deg');
  });
  card.addEventListener('mouseleave', function() {
    card.style.removeProperty('--mouse-x');
    card.style.removeProperty('--mouse-y');
    card.style.removeProperty('--holo-angle');
  });
}

function initCardEffects() {
  document.querySelectorAll('.poke-card').forEach(attachCardEffect);
}
window.initCardEffects = initCardEffects;

// Watch for new cards being added to the grid
(function() {
  const grid = document.getElementById('pokemon-grid');
  if (!grid) return;
  new MutationObserver(initCardEffects).observe(grid, { childList: true });
})();


// ── 4. 3D Interactive Hero Pokéball ────────────────────────────────
(function initHeroPokeball() {
  const pb    = document.getElementById('hero-pokeball');
  if (!pb) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const inner = pb.querySelector('.pb3d-inner');
  let raf, targetX = 0, targetY = 0, curX = 0, curY = 0;

  pb.addEventListener('mousemove', function(e) {
    const r    = pb.getBoundingClientRect();
    targetX    = ((e.clientX - r.left  - r.width  / 2) / r.width)  * 24;
    targetY    = ((e.clientY - r.top   - r.height / 2) / r.height) * -24;
  });
  pb.addEventListener('mouseleave', function() {
    targetX = 0; targetY = 0;
  });

  function smoothTilt() {
    curX += (targetX - curX) * 0.12;
    curY += (targetY - curY) * 0.12;
    inner.style.transform = `rotateY(${curX}deg) rotateX(${curY}deg)`;
    raf = requestAnimationFrame(smoothTilt);
  }
  smoothTilt();

  // Click: burst + bounce
  pb.addEventListener('click', function() {
    doBurst(pb);
    inner.style.transition = 'transform 0.15s ease-out';
    inner.style.transform  = 'scale(1.2)';
    setTimeout(function() {
      inner.style.transition = '';
      inner.style.transform  = '';
    }, 500);
  });
})();


// ── 5. Pokéball Burst Canvas ────────────────────────────────────────
function doBurst(origin) {
  const canvas = document.getElementById('burst-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('active');

  const rect = origin
    ? origin.getBoundingClientRect()
    : { left: canvas.width / 2, top: canvas.height / 2, width: 0, height: 0 };
  const ox = rect.left + rect.width  / 2;
  const oy = rect.top  + rect.height / 2;

  const COLS = ['#EE1515','#FFDE00','#3B4CCA','#ffffff','#FF6B35','#00CED1','#FF69B4'];
  const pts  = Array.from({ length: 36 }, function() {
    return {
      x: ox, y: oy,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.75) * 20,
      r:  Math.random() * 7 + 3,
      color: COLS[Math.floor(Math.random() * COLS.length)],
      life:  1,
      decay: Math.random() * 0.035 + 0.02,
      isStar: Math.random() > 0.55,
    };
  });

  let ringR = 0, ringA = 1;

  function drawStar(cx, cy, spikes, ro, ri) {
    const step = Math.PI / spikes;
    let rot = -Math.PI / 2;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r2 = i % 2 === 0 ? ro : ri;
      ctx.lineTo(cx + Math.cos(rot) * r2, cy + Math.sin(rot) * r2);
      rot += step;
    }
    ctx.closePath();
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Expanding ring
    if (ringA > 0) {
      ctx.save();
      ctx.globalAlpha = ringA * 0.8;
      ctx.beginPath();
      ctx.arc(ox, oy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFDE00';
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.restore();
      ringR += 9; ringA -= 0.05;
    }

    let alive = false;
    pts.forEach(function(p) {
      if (p.life <= 0) return;
      alive   = true;
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.45;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle   = p.color;
      if (p.isStar) {
        drawStar(p.x, p.y, 5, p.r, p.r * 0.45);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    });

    if (alive || ringA > 0) requestAnimationFrame(frame);
    else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.classList.remove('active');
    }
  }
  requestAnimationFrame(frame);
}
window.doBurst = doBurst;


// ── 6. Message fade-in on new bot messages ──────────────────────────
// Observes agent-messages and applies a scan-in animation to new bubbles
(function initMessageAnimations() {
  const msgBox = document.getElementById('agent-messages');
  if (!msgBox) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        const bubble = node.querySelector('.msg-bubble');
        if (!bubble) return;
        bubble.style.opacity = '0';
        bubble.style.transform = 'translateY(8px)';
        requestAnimationFrame(function() {
          bubble.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
          bubble.style.opacity    = '1';
          bubble.style.transform  = '';
        });
      });
    });
  }).observe(msgBox, { childList: true });
})();


// ── 7. Section Scroll-reveal ────────────────────────────────────────
(function initScrollReveal() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const selector = '.section-header h2, .section-header p, .stat-card';
  function reveal(el) {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(22px)';
    const io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (!e.isIntersecting) return;
        e.target.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
        e.target.style.opacity    = '1';
        e.target.style.transform  = '';
        io.disconnect();
      });
    }, { threshold: 0.15 });
    io.observe(el);
  }
  document.querySelectorAll(selector).forEach(reveal);
})();


// ── 8. Gallery polaroid — random rotation on each load ─────────────
// Rotations are set via CSS --rotate custom property in renderGallery (script.js).
// This adds the same rotation to .gallery-item after dynamic render.
window.applyPolaroidRotations = function() {
  const items = document.querySelectorAll('.gallery-item');
  items.forEach(function(item, i) {
    if (!item.style.getPropertyValue('--rotate')) {
      const rot = ((i % 7) - 3) + 'deg';
      item.style.setProperty('--rotate', rot);
    }
  });
};
