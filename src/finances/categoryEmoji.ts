// Picks a small picture for an expense category so all categories fit on screen without scrolling.
// A category she names with her own emoji first ("📦 אריזה") keeps it; otherwise a keyword decides.

const KEYWORDS: [string, string][] = [
  ['חומר', '💎'],
  ['זהב', '🥇'],
  ['כסף', '🪙'],
  ['אבן', '💎'],
  ['פנינ', '🦪'],
  ['אריז', '📦'],
  ['משלוח', '🚚'],
  ['דואר', '🚚'],
  ['שיווק', '📣'],
  ['פרסום', '📣'],
  ['מודעה', '📣'],
  ['ציוד', '🛠️'],
  ['כלי', '🛠️'],
  ['שכירות', '🏠'],
  ['ארנונה', '🏠'],
  ['חשמל', '💡'],
  ['מים', '💧'],
  ['אינטרנט', '🌐'],
  ['טלפון', '📱'],
  ['מס', '🧾'],
  ['ביטוח', '🛡️'],
  ['רואה חשבון', '🧮'],
  ['הנהלת', '🧮'],
  ['עמלה', '💳'],
  ['אשראי', '💳'],
  ['בנק', '🏦'],
  ['תוכנה', '💻'],
  ['מנוי', '💻'],
  ['אתר', '💻'],
  ['נסיעה', '🚗'],
  ['דלק', '⛽'],
  ['אוכל', '🍽️'],
  ['קורס', '🎓'],
  ['משכורת', '👤'],
  ['שכר', '👤'],
  ['צילום', '📷'],
]

const FALLBACK = '🏷️'

const LEADING_EMOJI = /^\s*(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u

/** The emoji for a category, and the name without it. */
export function categoryLook(name: string): { emoji: string; label: string } {
  const own = LEADING_EMOJI.exec(name)
  if (own) return { emoji: own[1], label: name.slice(own[0].length) || name }

  const hit = KEYWORDS.find(([word]) => name.includes(word))
  return { emoji: hit ? hit[1] : FALLBACK, label: name }
}
