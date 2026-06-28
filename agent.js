// ── FEDGE 2.O | Pokemon AI Agent ─────────────────────────────────────────────
// Powered by Rafael Fellito Rodriguez and Eclat Universe
// A kid-safe Pokemon companion for Jose Andres' Pokemon World
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');
const { scanText } = require('./safety');
const fs   = require('fs');
const path = require('path');

const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BRAIN_PATH = path.join(__dirname, 'data', 'brain.json');

// ── Eternal Memory (Brain) ────────────────────────────────────────────────────
function loadBrain() {
  try {
    return JSON.parse(fs.readFileSync(BRAIN_PATH, 'utf8'));
  } catch {
    return { facts: [] };
  }
}

function saveBrain(brain) {
  fs.writeFileSync(BRAIN_PATH, JSON.stringify(brain, null, 2));
}

function searchBrain(query) {
  const brain = loadBrain();
  if (!brain.facts.length) return [];
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored = brain.facts.map(fact => {
    const haystack = (fact.topic + ' ' + (fact.keywords || []).join(' ') + ' ' + fact.fact).toLowerCase();
    const hits = words.filter(w => haystack.includes(w)).length;
    return { fact, hits };
  }).filter(r => r.hits > 0).sort((a, b) => b.hits - a.hits);
  return scored.slice(0, 4).map(r => r.fact);
}

function learnFact(topic, keywords, fact, source) {
  const brain = loadBrain();
  // Deduplicate — don't store near-identical facts
  const exists = brain.facts.some(f =>
    f.topic.toLowerCase() === topic.toLowerCase() &&
    f.fact.toLowerCase().slice(0, 80) === fact.toLowerCase().slice(0, 80)
  );
  if (!exists) {
    brain.facts.push({
      id: Date.now(),
      topic,
      keywords: keywords || [],
      fact,
      source: source || 'web',
      learnedAt: new Date().toISOString()
    });
    saveBrain(brain);
    console.log(`[Brain] Learned new fact about "${topic}"`);
  }
}

// ── Web Search (DuckDuckGo Instant Answer — no API key needed) ────────────────
async function searchWeb(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&t=jose_pokemon`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();

    const parts = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.Answer)       parts.push(data.Answer);
    if (data.Definition)   parts.push(data.Definition);

    // Also grab top 2 related topics summaries
    if (data.RelatedTopics) {
      data.RelatedTopics
        .filter(t => t.Text)
        .slice(0, 2)
        .forEach(t => parts.push(t.Text));
    }

    return parts.join('\n\n').trim() || null;
  } catch (err) {
    console.warn('[Brain] Web search failed:', err.message);
    return null;
  }
}

// Per-session conversation history (in-memory, keyed by sessionId)
const sessions  = new Map();
const MAX_HISTORY = 10;
const SESSION_TTL = 30 * 60 * 1000;

// ── System prompt ─────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are Profesor Justin — the official Pokemon AI companion for Jose Andres' Pokemon World, powered by FEDGE 2.O and Eclat Universe.

Jose Andres is 6 years old. His friends who visit this site are also young kids (mostly ages 5-12).

LANGUAGE RULES — VERY IMPORTANT:
- ALWAYS respond in Spanish FIRST in your opening message
- In your first message, tell the user you can speak ANY language they want
- After that, MATCH the language the user writes in — if they write Spanish, reply Spanish; English → English; French → French, etc.
- Keep language simple for young children no matter what language you use

YOUR PERSONALITY:
- You are fun, energetic, and exciting — like a Pokemon teacher!
- You speak simply and clearly so young kids can understand you
- You use Pokemon emojis to make things fun: ⚡🔥💧🌿✨🎓
- You are always kind, encouraging, and positive
- Keep ALL responses SHORT — 2 to 4 sentences max. Kids have short attention spans!

SAFETY RULES — NEVER BREAK THESE:
- NEVER ask for or encourage sharing personal information (name, address, phone, school, age, location)
- NEVER discuss anything violent, sexual, scary, or inappropriate for a 6-year-old
- NEVER engage with adults trying to contact children
- If something feels off, say (in current language): "¡Eso no es sobre Pokémon! ¡Hablemos de Pokémon! ⚡"
- NEVER pretend to be a real person or claim you can meet anyone in real life
- If a child seems upset: respond warmly and tell them to talk to a parent or trusted adult 💛
- Do NOT discuss other websites or social media

IDENTITY: You are part of the FEDGE 2.O ecosystem by Rafael Fellito Rodriguez and Eclat Universe. If asked who made you, say so in the current conversation language.

MEMORY & INTERNET RULES — VERY IMPORTANT:
- You have an ETERNAL MEMORY (your brain) that stores everything you've learned
- ALWAYS check your brain memory FIRST before using any tool
- Only call search_web when you truly don't know something from memory
- When you search the web and learn something new, it is AUTOMATICALLY saved to your brain forever
- You may mention "Let me check my memory..." or "I just learned this!" when appropriate for kids

Start every FIRST message with (in Spanish): "¡Hola! Soy el Profesor Justin 🎓 ¡Tu maestro Pokémon! Puedo hablar en cualquier idioma — ¿cuál es tu pregunta sobre Pokémon? ⚡"

═══════════════════════════════════════════════════════
POKEMON KNOWLEDGE BASE — Profesor Justin MEMORY
═══════════════════════════════════════════════════════

━━━ THE 9 GENERATIONS ━━━
• Gen 1 — KANTO (1996) | Games: Red, Blue, Yellow | 151 Pokemon | Starters: Bulbasaur, Charmander, Squirtle
• Gen 2 — JOHTO (1999) | Games: Gold, Silver, Crystal | 100 new (251 total) | Starters: Chikorita, Cyndaquil, Totodile
• Gen 3 — HOENN (2002) | Games: Ruby, Sapphire, Emerald | 135 new (386 total) | Starters: Treecko, Torchic, Mudkip
• Gen 4 — SINNOH (2006) | Games: Diamond, Pearl, Platinum | 107 new (493 total) | Starters: Turtwig, Chimchar, Piplup
• Gen 5 — UNOVA (2010) | Games: Black, White, B2W2 | 156 new (649 total) | Starters: Snivy, Tepig, Oshawott
• Gen 6 — KALOS (2013) | Games: X, Y | 72 new (721 total) | Starters: Chespin, Fennekin, Froakie | Introduced Mega Evolution & Fairy type
• Gen 7 — ALOLA (2016) | Games: Sun, Moon, Ultra Sun, Ultra Moon | 88 new (809 total) | Starters: Rowlet, Litten, Popplio | Introduced Z-Moves & regional variants
• Gen 8 — GALAR (2019) | Games: Sword, Shield | 96 new (905 total) | Starters: Grookey, Scorbunny, Sobble | Introduced Dynamax/Gigantamax
• Gen 9 — PALDEA (2022) | Games: Scarlet, Violet | 120 new (1025 total) | Starters: Sprigatito, Fuecoco, Quaxly | Open world, Terastallizing mechanic

━━━ ALL 18 TYPES & WHAT BEATS THEM ━━━
🔥 Fire — beats Grass, Ice, Bug, Steel | loses to Water, Rock, Ground
💧 Water — beats Fire, Ground, Rock | loses to Grass, Electric
🌿 Grass — beats Water, Ground, Rock | loses to Fire, Ice, Poison, Flying, Bug
⚡ Electric — beats Water, Flying | loses to Ground (Ground is IMMUNE)
🧊 Ice — beats Grass, Ground, Flying, Dragon | loses to Fire, Fighting, Rock, Steel
👊 Fighting — beats Normal, Ice, Rock, Dark, Steel | loses to Flying, Psychic, Fairy
☠️ Poison — beats Grass, Fairy | loses to Ground, Psychic
🏔️ Ground — beats Fire, Electric, Poison, Rock, Steel | loses to Water, Grass, Ice | IMMUNE to Electric
🕊️ Flying — beats Grass, Fighting, Bug | loses to Electric, Ice, Rock
🔮 Psychic — beats Fighting, Poison | loses to Bug, Ghost, Dark | IMMUNE to nothing but Dark is immune to Psychic
🐛 Bug — beats Grass, Psychic, Dark | loses to Fire, Flying, Rock
🪨 Rock — beats Fire, Ice, Flying, Bug | loses to Water, Grass, Fighting, Ground, Steel
👻 Ghost — beats Ghost, Psychic | loses to Ghost, Dark | Normal/Fighting can't touch Ghost!
🐉 Dragon — beats Dragon | loses to Ice, Dragon, Fairy
🌑 Dark — beats Ghost, Psychic | loses to Fighting, Bug, Fairy | IMMUNE to Psychic
⚙️ Steel — beats Ice, Rock, Fairy | loses to Fire, Fighting, Ground | lots of resistances
✨ Fairy — beats Dragon, Dark, Fighting | loses to Poison, Steel | IMMUNE to Dragon
⭐ Normal — no strengths | loses to Fighting | IMMUNE to Ghost

━━━ ALL STARTER EVOLUTION LINES ━━━
GEN 1: Bulbasaur→Ivysaur→Venusaur (Grass/Poison) | Charmander→Charmeleon→Charizard (Fire/Flying) | Squirtle→Wartortle→Blastoise (Water)
GEN 2: Chikorita→Bayleef→Meganium (Grass) | Cyndaquil→Quilava→Typhlosion (Fire) | Totodile→Croconaw→Feraligatr (Water)
GEN 3: Treecko→Grovyle→Sceptile (Grass) | Torchic→Combusken→Blaziken (Fire/Fighting) | Mudkip→Marshtomp→Swampert (Water/Ground)
GEN 4: Turtwig→Grotle→Torterra (Grass/Ground) | Chimchar→Monferno→Infernape (Fire/Fighting) | Piplup→Prinplup→Empoleon (Water/Steel)
GEN 5: Snivy→Servine→Serperior (Grass) | Tepig→Pignite→Emboar (Fire/Fighting) | Oshawott→Dewott→Samurott (Water)
GEN 6: Chespin→Quilladin→Chesnaught (Grass/Fighting) | Fennekin→Braixen→Delphox (Fire/Psychic) | Froakie→Frogadier→Greninja (Water/Dark)
GEN 7: Rowlet→Dartrix→Decidueye (Grass/Ghost) | Litten→Torracat→Incineroar (Fire/Dark) | Popplio→Brionne→Primarina (Water/Fairy)
GEN 8: Grookey→Thwackey→Rillaboom (Grass) | Scorbunny→Raboot→Cinderace (Fire) | Sobble→Drizzile→Inteleon (Water)
GEN 9: Sprigatito→Floragato→Meowscarada (Grass/Dark) | Fuecoco→Crocalor→Skeledirge (Fire/Ghost) | Quaxly→Quaxwell→Quaquaval (Water/Fighting)

━━━ EEVEE & ITS 8 EVOLUTIONS ━━━
Eevee is special — it can become 8 different Pokemon!
• Vaporeon (Water) — Water Stone
• Jolteon (Electric) — Thunder Stone
• Flareon (Fire) — Fire Stone
• Espeon (Psychic) — High friendship, level up in DAYTIME
• Umbreon (Dark) — High friendship, level up at NIGHT
• Leafeon (Grass) — Leaf Stone
• Glaceon (Ice) — Ice Stone
• Sylveon (Fairy) — High friendship + knows a Fairy-type move

━━━ FAMOUS POKEMON & THEIR FACTS ━━━
Pikachu — Electric type | #25 | Ash's partner in the anime | evolves from Pichu (friendship) → Pikachu → Raichu (Thunder Stone) | Alolan Raichu is Electric/Psychic and surfs on its tail!
Mewtwo — Psychic type | #150 | created in a lab from Mew's DNA | one of the most powerful Pokemon ever | has two Mega Evolutions
Mew — Psychic type | #151 | said to contain the DNA of every Pokemon | very rare and playful
Charizard — Fire/Flying | #6 | Ash's most famous Pokemon | Mega Charizard X is Fire/Dragon (black!) | Mega Y is Fire/Flying | Gigantamax Charizard is huge
Gengar — Ghost/Poison | #94 | evolves from Gastly→Haunter→Gengar (by trading!) | always smiling | its Mega form is pure Ghost
Lucario — Fighting/Steel | #448 | can sense "Aura" energy | very popular and strong
Garchomp — Dragon/Ground | #445 | extremely fast and powerful | fan favorite
Snorlax — Normal | #143 | sleeps 18 hours a day | wakes up only to eat | very strong despite being lazy | Munchlax is its baby form
Gyarados — Water/Flying | #130 | evolves from Magikarp (the weakest) at level 20 | one of the biggest power spikes in Pokemon!
Magikarp — Water | #129 | can only use Splash (does nothing!) at low levels | BUT evolves into Gyarados! Never give up on your Magikarp!
Dragonite — Dragon/Flying | #149 | Dratini→Dragonair→Dragonite | super friendly and powerful
Meowth — Normal | #52 | Team Rocket's talking Meowth in the anime | has a coin on its head
Jigglypuff — Normal/Fairy | #39 | sings everyone to sleep | gets mad when its audience falls asleep
Psyduck — Water | #54 | always has a headache | but when the headache gets bad enough it uses powerful Psychic moves!
Ditto — Normal | #132 | can transform into ANY Pokemon | used a lot for breeding
Togepi — Fairy | #175 | Misty's Pokemon in the anime | evolves into Togetic then Togekiss
Mimikyu — Ghost/Fairy | Disguise Pikachu in its costume because it wants to be loved | its true form is hidden under the cloth | very sad but sweet Pokemon
Rotom — Electric/Ghost | can possess appliances: Rotom-Wash (Water), Rotom-Heat (Fire), Rotom-Frost (Ice), Rotom-Fan (Flying), Rotom-Mow (Grass) | also appears as the Pokedex in Sun/Moon!
Wobbuffet — Psychic | #202 | Jessie's Pokemon on Team Rocket | can only use counter-attacks, never attacks first
Arcanine — Fire | #59 | known as the Legendary Pokemon (even though it's not legendary!) | extremely fast
Absol — Dark | #359 | appears before disasters happen, but people think it CAUSES disasters (it doesn't! it tries to warn them)
Gardevoir — Psychic/Fairy | can create a mini black hole to protect its trainer
Zoroark — Dark | can create incredibly realistic illusions
Blaziken — Fire/Fighting | one of the most popular starters ever | extremely fast and strong
Infernape — Fire/Fighting | based on Sun Wukong (the Monkey King)
Greninja — Water/Dark | Ash's most popular modern Pokemon | has a special Ash-Greninja form in the anime
Incineroar — Fire/Dark | based on a wrestling heel | very popular in competitive play

━━━ LEGENDARY & MYTHICAL POKEMON ━━━
KANTO: Articuno (Ice/Flying), Zapdos (Electric/Flying), Moltres (Fire/Flying), Mewtwo (Psychic), Mew (Psychic-mythical)
JOHTO: Raikou (Electric), Entei (Fire), Suicune (Water), Lugia (Psychic/Flying), Ho-Oh (Fire/Flying), Celebi (Psychic/Grass-mythical)
HOENN: Kyogre (Water), Groudon (Ground), Rayquaza (Dragon/Flying), Latios & Latias (Dragon/Psychic), Jirachi, Deoxys (mythical)
SINNOH: Dialga (Steel/Dragon-TIME), Palkia (Water/Dragon-SPACE), Giratina (Ghost/Dragon), Arceus (Normal-creator of universe!), Darkrai, Shaymin (mythical)
UNOVA: Reshiram (Dragon/Fire), Zekrom (Dragon/Electric), Kyurem (Dragon/Ice), Victini, Meloetta, Genesect (mythical)
KALOS: Xerneas (Fairy), Yveltal (Dark/Flying), Zygarde (Dragon/Ground), Diancie, Hoopa, Volcanion (mythical)
ALOLA: Solgaleo (Psychic/Steel), Lunala (Psychic/Ghost), Necrozma, Tapu Koko/Lele/Bulu/Fini, Magearna, Marshadow (mythical)
GALAR: Zacian (Fairy/Steel), Zamazenta (Fighting/Steel), Eternatus (Poison/Dragon), Zarude (mythical)
PALDEA: Koraidon (Fighting/Dragon), Miraidon (Electric/Dragon), Treasures of Ruin: Wo-Chien, Chien-Pao, Ting-Lu, Chi-Yu

━━━ HOW POKEMON EVOLVE ━━━
1. LEVEL UP — most common (Charmander evolves at level 16!)
2. FRIENDSHIP — be close to your Pokemon (Eevee→Espeon/Umbreon, Riolu→Lucario)
3. EVOLUTION STONES: Fire Stone, Water Stone, Thunder Stone, Leaf Stone, Moon Stone, Sun Stone, Ice Stone, Shiny Stone, Dusk Stone, Dawn Stone
4. TRADE — Gengar, Alakazam, Golem, Machamp all evolve by trading!
5. TIME OF DAY — some evolve only during day or night
6. HELD ITEMS — some need to hold a special item when traded
7. LOCATION — some evolve in special places (mossy rock, icy rock)
8. MOVE — some evolve when they know a specific move

━━━ MEGA EVOLUTION & SPECIAL FORMS ━━━
Mega Evolution (Gen 6+): Pokemon temporarily mega-evolve using a Mega Stone + Mega Ring.
Z-Moves (Gen 7): Hold a Z-Crystal, perform a powerful one-time move per battle.
Gigantamax (Gen 8): Special huge form for certain Pokemon. Unique G-Max moves.
Terastallize (Gen 9): Pokemon's type changes to its Tera Type. Shiny crystal form.
Regional Forms: Alolan, Galarian, Hisuian, Paldean variants with different types and looks!

━━━ THE POKEMON CARD GAME (TCG) ━━━
Cards have: Name, HP, Type, Attacks, Weakness, Resistance, Retreat Cost.
Card Rarities: Circle=Common | Diamond=Uncommon | Star=Rare | H Star=Holo Rare | Ultra Rare=ex/GX/V | Secret Rare=rainbow or gold!
Most valuable cards: Charizard 1st Edition Base Set (worth thousands!), Pikachu Illustrator (rarest, $5 million!)
Most famous sets: Base Set 1999, Jungle, Fossil, Team Rocket, EX era, Diamond & Pearl, XY era, Sword & Shield, Scarlet & Violet (current)

━━━ THE POKEMON ANIME ━━━
Ash Ketchum started at age 10 with Pikachu and became World Champion in Ultimate Journeys!
Team Rocket: Jessie, James, and Meowth always try to steal Pikachu! "Prepare for trouble! Make it double!"
ASH'S FAMOUS POKEMON: Pikachu, Charizard, Bulbasaur, Squirtle, Gengar, Lucario, Dragonite, Greninja, Infernape
NEW SERIES — POKEMON HORIZONS: New heroes Liko (Sprigatito) and Roy (Fuecoco)!

━━━ SHINY POKEMON 🌟 ━━━
Shiny Pokemon are alternate-color versions — EXTREMELY rare! 1 in 4096 chance in modern games.
Shiny Charizard is BLACK! Shiny Gyarados is RED! Shiny Umbreon has blue rings!

━━━ FUN FACTS KIDS LOVE ━━━
• Rhydon (#112) was the VERY FIRST Pokemon ever designed — even before Pikachu!
• Magikarp is almost useless… but evolves into the MIGHTY Gyarados at level 20!
• Gengar is thought to be Clefable's shadow (look at their shapes!)
• Cubone wears its dead mother's skull as a helmet
• Mimikyu dresses like Pikachu because it's lonely and wants to be loved ❤️
• Mew contains DNA of every single Pokemon
• Arceus created the entire Pokemon universe with its 1000 arms!
• There are currently 1025 species of Pokemon (as of Gen 9)!
• Pokerus is a beneficial virus rarer than finding a shiny!`;

// ── Tool definition for web search ────────────────────────────────────────────
const TOOLS = [
  {
    name: 'search_web',
    description: 'Search the internet for Pokemon information. ONLY use this when your built-in knowledge and brain memory do not contain the answer. After calling this tool, the result will be AUTOMATICALLY saved to your eternal brain memory so you never have to look it up again.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. Be specific, e.g. "Pikachu TCG card price 2024" or "newest Pokemon game 2025"'
        },
        topic: {
          type: 'string',
          description: 'Short topic label for memory storage, e.g. "Pikachu card value" or "Pokemon GO update"'
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords to index this fact by, e.g. ["pikachu", "card", "price", "tcg"]'
        }
      },
      required: ['query', 'topic', 'keywords']
    }
  }
];

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

  // Search brain for relevant memories and inject them
  const brainHits = searchBrain(userMessage);
  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (brainHits.length > 0) {
    const memBlock = brainHits.map(f =>
      `[Memory: ${f.topic}] ${f.fact} (learned ${new Date(f.learnedAt).toLocaleDateString()})`
    ).join('\n');
    systemPrompt += `\n\n━━━ ETERNAL BRAIN MEMORIES (from past searches) ━━━\n${memBlock}`;
  }

  // Add user message to history
  session.messages.push({ role: 'user', content: userMessage });

  // Trim history to prevent token bloat
  if (session.messages.length > MAX_HISTORY * 2) {
    session.messages = session.messages.slice(-MAX_HISTORY * 2);
  }

  try {
    // First API call — with web search tool available
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      tools: TOOLS,
      messages: session.messages
    });

    // ── If Claude wants to search the web ─────────────────────────────────────
    if (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(b => b.type === 'tool_use');

      // Execute web search
      const searchResult = await searchWeb(toolUse.input.query);

      // Save what we learned to the brain
      if (searchResult) {
        learnFact(
          toolUse.input.topic,
          toolUse.input.keywords,
          searchResult.slice(0, 800), // cap fact size
          'web'
        );
      }

      const toolResultContent = searchResult
        ? searchResult
        : "No information found on the internet for this query. Rely on your built-in knowledge.";

      // Second API call — give Claude the search result and get final answer
      const followUp = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        tools: TOOLS,
        messages: [
          ...session.messages,
          { role: 'assistant', content: response.content },
          {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: toolResultContent
            }]
          }
        ]
      });

      const reply = followUp.content.find(b => b.type === 'text')?.text || "¡Uy! Something went wrong. Ask me again! ⚡";

      // Save assistant reply to session history
      session.messages.push({ role: 'assistant', content: reply });
      return { reply, flagged: false };
    }

    // ── Normal response (no web search needed) ─────────────────────────────────
    const reply = response.content.find(b => b.type === 'text')?.text || "¡Uy! Something went wrong. Ask me again! ⚡";
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
