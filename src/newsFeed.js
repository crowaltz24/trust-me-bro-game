const NEWS_TEMPLATES = [
  { text: "Regulator eyes {asset} after viral pump spree", impact: -0.18 },
  { text: "Celebrity mentions {asset} on stream", impact: 0.22 },
  { text: "Whale activity spikes around {asset}", impact: 0.15 },
  { text: "Rumors swirl of {asset} partnership deal", impact: 0.12 },
  { text: "Hackers target {asset} wallet ecosystem", impact: -0.2 },
  { text: "Analyst upgrades {asset} to moon", impact: 0.18 },
  { text: "Supply shock hits {asset} holders", impact: -0.15 },
  { text: "Short sellers retreat as {asset} squeezes higher", impact: 0.2 },
  { text: "Liquidity dries up in {asset} order books", impact: -0.14 },
  { text: "Exchange lists {asset} in surprise update", impact: 0.16 },
  { text: "Large holder unloads {asset} into the close", impact: -0.17 },
  { text: "Insider chatter heats up for {asset}", impact: 0.13 },
  { text: "Regulator approves experimental {asset} product", impact: 0.19 },
  { text: "Network outage spooks {asset} holders", impact: -0.16 },
  { text: "Market maker widens spreads on {asset}", impact: -0.12 },
  { text: "ETF rumor reignites interest in {asset}", impact: 0.14 },
  { text: "Unexpected dilution announced by {asset}", impact: -0.2 },
];

const SOCIAL_TEMPLATES = [
  { text: "My cousin says {asset} is the next 100x", impact: 0.1 },
  { text: "Anyone else dumping {asset} today?", impact: -0.08 },
  { text: "{asset} chart looks like a ski slope", impact: -0.12 },
  { text: "{asset} feels calm... too calm", impact: -0.05 },
  { text: "{asset} to the moon!!!", impact: 0.14 },
  { text: "Bought {asset} with rent money", impact: 0.06 },
  { text: "{asset} is printing, I can feel it", impact: 0.08 },
  { text: "I just panic sold {asset}. Sorry everyone LMAO", impact: -0.09 },
  { text: "{asset} is either a 10x or a 0, no in-between", impact: 0.04 },
  { text: "{asset} looks dead. Anyone still holding?", impact: -0.07 },
  { text: "Whales are watching {asset}. stay sharp", impact: 0.05 },
  { text: "{asset} is the only thing green on my screen", impact: 0.07 },
  { text: "{asset} bags getting heavy", impact: -0.06 },
  { text: "{asset} breakout in 3...2...", impact: 0.09 },
  { text: "{asset} is cooked", impact: -0.1 },
  { text: "Adding {asset} here, do not fade me", impact: 0.08 },
];

export function generateFeed(rng, assets) {
  const items = [];
  for (let i = 0; i < 3; i += 1) {
    items.push(createItem(rng, assets, NEWS_TEMPLATES, "news"));
    items.push(createItem(rng, assets, SOCIAL_TEMPLATES, "social"));
  }
  return items;
}

export function createItem(rng, assets, templates, kind) {
  const asset = assets[Math.floor(rng() * assets.length)];
  const template = templates[Math.floor(rng() * templates.length)];
  const text = template.text.replace("{asset}", asset.id);
  return {
    kind,
    text,
    impact: template.impact,
    tags: [asset.id, asset.type],
  };
}
