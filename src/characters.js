const CHARACTERS = [
  {
    id: "cryptobro",
    name: "Crypto Bro",
    style: "exit liquidity enthusiast",
    persona: "Hype-chasing crypto gambler who talks fast, flexes wins, and leans on buzzwords. Use emojis like 🚀 or 💎",
    schemeChance: 0.45,
    impact: 0.18,
  },
  {
    id: "guru",
    name: "Macro Guru",
    style: "it's actually very simple",
    persona: "Macro commentator who frames everything as a big-picture narrative and causal chain.",
    schemeChance: 0.6,
    impact: 0.16,
  },
  {
    id: "yoga",
    name: "Yoga Instructor",
    style: "i feel it in my chakras",
    persona: "New age coach who speaks in vibes, intuition, and calm encouragement.",
    schemeChance: 0.35,
    impact: 0.2,
  },
  {
    id: "skeptic",
    name: "Skeptic Analyst",
    style: "akshually ☝️🤓",
    persona: "Pedantic analyst who nitpicks, cites caveats, and hates sloppy reasoning.",
    schemeChance: 0.2,
    impact: 0.12,
  },
  {
    id: "insider",
    name: "Insider Uncle",
    style: "can't say how i know",
    persona: "Networking type who hints at insider info and speaks in coy fragments.",
    schemeChance: 0.7,
    impact: 0.25,
  },
  {
    id: "babe",
    name: "Babe <3",
    style: "This contact has blocked you.",
    persona: "Unavailable.",
    schemeChance: 0,
    impact: 0,
  },
];

const ADVICE_BANK = {
  buy: [
    "You have to BUY {asset}. This is the breakout.",
    "{asset} is about to melt faces. Load up.",
    "If you miss {asset} now, you will regret it forever.",
    "Buy {asset} on any dip. This is a gift.",
    "Add {asset} here. Momentum is building.",
    "You want exposure? {asset} is the cleanest shot.",
  ],
  sell: [
    "{asset} is topped. Dump before the knives hit.",
    "Sell {asset} or you are the exit liquidity.",
    "Take profits on {asset} and thank me later.",
    "Rotate out of {asset}. Risk is too high.",
    "Trim {asset} now. You can always buy back.",
    "{asset} is crowded. Reduce exposure.",
  ],
  short: [
    "{asset} is overextended. Sell and stand aside.",
    "Fade the hype on {asset}. I already am.",
    "{asset} is a trap. Reduce exposure now.",
    "{asset} is a perfect short. Weak bids everywhere.",
    "Short {asset} into the next pop.",
    "Borrow costs are cheap. {asset} is the move.",
  ],
};

const INTENTS = ["buy", "sell", "short"];

export function getCharacters() {
  return CHARACTERS;
}

export function getAdvice(character, market, rng) {
  const isScheme = rng() < character.schemeChance;
  const intent = INTENTS[Math.floor(rng() * INTENTS.length)];
  const asset = market.assets[Math.floor(rng() * market.assets.length)];
  const assetId = asset.id;

  const templates = ADVICE_BANK[intent] || ADVICE_BANK.buy;
  const template = templates[Math.floor(rng() * templates.length)];
  const text = template.replace("{asset}", assetId);

  const baseImpact = character.impact + rng() * 0.06;
  let impact = intent === "buy" ? baseImpact : -baseImpact;
  if (isScheme) {
    impact *= -1;
  }
  const delayMs = 2000 + Math.floor(rng() * 3000);

  return {
    characterId: character.id,
    intent,
    assetId,
    text,
    isScheme,
    impact,
    delayMs,
  };
}

export function buildAdvicePrompt(character, advice) {
  const truthStatus = advice.isScheme ? "scheme" : "legit";
  const system = `You are ${character.name}, a contact in a finance meme chat. Persona: ${character.persona} Style: ${character.style}. Stay in character. Write a short sentence as a text message. ALWAYS mention by name what stock you're talking about. Never mention being an AI or that this is a game. Do not say "scheme" or "legit". Do not give actual financial advice. Do not tell the user to do their own research.`;
  const user = `Your true intent: ${advice.intent} a stock/coin named "${advice.assetId}". Truth status: ${truthStatus}. If truth status is scheme, sound vague and a little pushy with subtle red flags. If truth status is legit, sound grounded with a simple concrete reason and a gentle caution. Keep it subtle and natural.`;
  return { system, user };
}
