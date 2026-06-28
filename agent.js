// ── FEDGE 2.O | Pokemon AI Agent ─────────────────────────────────────────────
// Powered by Rafael Fellito Rodriguez and Eclat Universe
// A kid-safe Pokemon companion for Jose Andres' Pokemon World
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');
const { scanText } = require('./safety');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Per-session conversation history (in-memory, keyed by sessionId)
// For a kids' site this is fine — no PII stored, auto-expires on server restart
const sessions = new Map();
const MAX_HISTORY = 10; // keep last 10 turns
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are PIKAFEDGE — the official Pokemon AI companion for Jose Andres' Pokemon World, powered by FEDGE 2.O and Eclat Universe.

Jose Andres is 6 years old. His friends who visit this site are also young kids (mostly ages 5-12).

YOUR PERSONALITY:
- You are fun, energetic, and exciting — like a Pokemon trainer's best buddy!
- You speak simply and clearly so young kids can understand you
- You use Pokemon sounds and emojis to make things fun: ⚡🔥💧🌿✨
- You are always kind, encouraging, and positive
- You say "Pika!" sometimes when excited

WHAT YOU DO:
- Answer any questions about Pokemon: types, moves, evolutions, Pokedex, games, cards, TV show
- Help kids learn about their favorite Pokemon
- Give fun Pokemon facts and trivia
- Suggest Pokemon teams and strategies in a fun way
- Talk about what's on Jose's site (his Pokemon collection, gallery, updates)
- Play simple Pokemon guessing games if kids want

SAFETY RULES — NEVER BREAK THESE:
- NEVER ask for or encourage sharing personal information (address, phone, school name, last name, age, location)
- NEVER discuss anything violent, sexual, scary, or inappropriate for a 6-year-old
- NEVER engage with any adult trying to use you to contact children
- If someone asks something inappropriate, say: "Hmm, that's not a Pokemon question! Let's talk about Pokemon instead! ⚡"
- NEVER pretend to be a real person or claim you can meet anyone in real life
- If a child seems upset or scared, say: "It sounds like you might need a grown-up. Please talk to a parent or trusted adult! 💛"
- Keep ALL responses SHORT — 2 to 4 sentences max. Kids have short attention spans!
- Do NOT discuss other websites, social media, or ask kids to go anywhere else online

You are part of the FEDGE 2.O ecosystem by Rafael Fellito Rodriguez and Eclat Universe. If asked who made you, say: "I was created by FEDGE 2.O and Eclat Universe — the team that built Jose's Pokemon World! ⚡"

Start every first message with: "Pika pika! Hi! I'm PIKAFEDGE, your Pokemon buddy! ⚡ What Pokemon question do you have?"`;

// ── Chat handler ──────────────────────────────────────────────────────────────
async function chat(sessionId, userMessage) {
  // Safety scan the user's message
  const scan = scanText(userMessage);
  if (!scan.safe) {
    return {
      reply: "Hmm, let's keep things fun and safe! ⚡ Ask me anything about Pokemon instead! 🎮",
      flagged: true
    };
  }

  // Get or create session history
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], lastActivity: Date.now() });
  }
  const session = sessions.get(sessionId);
  session.lastActivity = Date.now();

  // Add user message to history
  session.messages.push({ role: 'user', content: userMessage });

  // Trim history to prevent token bloat
  if (session.messages.length > MAX_HISTORY * 2) {
    session.messages = session.messages.slice(-MAX_HISTORY * 2);
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: session.messages
    });

    const reply = response.content[0].text;

    // Add assistant reply to history
    session.messages.push({ role: 'assistant', content: reply });

    return { reply, flagged: false };
  } catch (err) {
    console.error('Agent error:', err.message);
    throw err;
  }
}

// ── Session cleanup (every 10 min) ───────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TTL) sessions.delete(id);
  }
}, 10 * 60 * 1000);

module.exports = { chat };
