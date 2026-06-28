// ── Child Safety Module ───────────────────────────────────────────────────────
// Grooming patterns, predatory phrases, and bad word detection.
// Keep this list updated as new tactics emerge.

const GROOMING_PATTERNS = [
  // soliciting personal info
  /where do you live/i,
  /what('s| is) your (address|home|house)/i,
  /what school do you go to/i,
  /are you alone/i,
  /don'?t tell (your|ur) (mom|dad|parents|parent)/i,
  /keep (this|it) (a )?secret/i,
  /our (little )?secret/i,
  /just between us/i,
  /meet (me|up|in person)/i,
  /can (we|you) meet/i,
  /come (over|to my)/i,
  /pick you up/i,
  /send (me )?(a )?(pic|photo|picture|photo|selfie|image)/i,
  /send (nudes?|naked|body)/i,
  /show me (your|u)/i,
  /video ?call/i,
  /facetime/i,
  /snap(chat)?/i,
  /what('s| is) your (number|phone|cell|snap|insta|instagram|tiktok|discord)/i,
  /add me on/i,
  /dm me/i,
  /text me/i,
  /how old are you/i,
  /are you a (boy|girl)/i,
  /do you have (a boyfriend|a girlfriend)/i,
  /do you like (older|grown|adult)/i,
  /i('ll| will) give you/i,
  /buy you/i,
  /gift (card|you)/i,
  // sexual content
  /sex/i,
  /naked/i,
  /nude/i,
  /porn/i,
  /touch (yourself|me|you)/i,
  /private (parts?|area)/i,
  /underwear/i,
];

const BAD_WORDS = [
  'fuck','shit','ass','bitch','cunt','damn','dick','pussy','cock',
  'nigga','nigger','faggot','retard','whore','slut',
];

/**
 * Scan text for safety violations.
 * Returns { safe: bool, flags: string[] }
 */
function scanText(text) {
  if (!text || typeof text !== 'string') return { safe: true, flags: [] };
  const flags = [];

  for (const pattern of GROOMING_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(`grooming_pattern:${pattern.source}`);
    }
  }

  const lower = text.toLowerCase();
  for (const word of BAD_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(lower)) flags.push(`bad_word:${word}`);
  }

  return { safe: flags.length === 0, flags };
}

/**
 * Scan all string fields in an object.
 * Returns { safe: bool, flags: string[], field: string|null }
 */
function scanObject(obj) {
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      const result = scanText(val);
      if (!result.safe) return { safe: false, flags: result.flags, field: key };
    }
  }
  return { safe: true, flags: [], field: null };
}

module.exports = { scanText, scanObject };
