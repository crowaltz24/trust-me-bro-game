import { createRng } from "./state.js";

const BASE_ASSETS = [
  {
    id: "DDY",
    name: "DDY",
    type: "stocks",
    description: "Baby Oil Production",
    price: 22,
    drift: 0.0003,
    volatility: 0.025,
  },
  {
    id: "EPSN",
    name: "EPSN",
    type: "stocks",
    description: "Private Island Logistics",
    price: 38,
    drift: -0.0002,
    volatility: 0.015,
  },
  {
    id: "TATE",
    name: "TATE",
    type: "stocks",
    description: "Bugatti Warranty Services",
    price: 51,
    drift: -0.0004,
    volatility: 0.03,
  },
  {
    id: "MLM",
    name: "MLM",
    type: "stocks",
    description: "Essential Oils & Recruitment",
    price: 37,
    drift: -0.0004,
    volatility: 0.028,
  },
  {
    id: "FUKD",
    name: "FUKD",
    type: "stocks",
    description: "Fine British Dining Chain",
    price: 81,
    drift: -0.0001,
    volatility: 0.016,
  },
  {
    id: "DOGEX",
    name: "DOGEX",
    type: "crypto",
    description: "Meme dog coin",
    price: 7.84,
    drift: 0.0016,
    volatility: 0.035,
  },
  {
    id: "HWKT",
    name: "HWKT",
    type: "crypto",
    description: "Hawk-a-thoon official coin (Audit Coming Soon)",
    price: 14.2,
    drift: -0.0005,
    volatility: 0.045,
  },
  {
    id: "COPE",
    name: "COPE",
    type: "crypto",
    description: "Mental Health Token",
    price: 9.2,
    drift: 0.0005,
    volatility: 0.035,
  },
  {
    id: "PONZI",
    name: "PONZI",
    type: "crypto",
    description: "A totally legit stablecoin",
    price: 16.2,
    drift: 0.0004,
    volatility: 0.05,
  },
];

export function createMarket(seed) {
  const rng = createRng(seed);
  const assets = BASE_ASSETS.map((asset) => ({
    ...asset,
    sentiment: rng() * 0.2 - 0.1,
    history: [],
  }));

  const decaySentiment = (asset) => {
    const magnitude = Math.abs(asset.sentiment);
    const extraDecay = Math.min(0.02, magnitude * 0.08);
    const factor = Math.max(0.94, 0.985 - extraDecay);
    asset.sentiment *= factor;
  };

  assets.forEach((asset) => {
    let price = asset.price;
    for (let i = 0; i < 60; i += 1) {
      const sentimentPush = asset.sentiment * 0.003;
      const noise = (rng() - 0.5) * asset.volatility;
      const drift = asset.drift + sentimentPush;
      const change = drift + noise;
      price = Math.max(0.05, price * (1 + change));
      decaySentiment(asset);
      asset.history.push(price);
    }
    asset.price = price;
  });

  return {
    rng,
    assets,
    lastEvent: null,
  };
}

export function restoreMarket(savedMarket, seed) {
  const rng = createRng(seed);
  const assets = (savedMarket?.assets || []).map((asset) => ({
    ...asset,
    history: Array.isArray(asset.history) ? [...asset.history] : [],
  }));
  return {
    rng,
    assets,
    lastEvent: savedMarket?.lastEvent || null,
  };
}

export function tickMarket(market) {
  const decaySentiment = (asset) => {
    const magnitude = Math.abs(asset.sentiment);
    const extraDecay = Math.min(0.02, magnitude * 0.08);
    const factor = Math.max(0.94, 0.985 - extraDecay);
    asset.sentiment *= factor;
  };

  market.assets.forEach((asset) => {
    const sentimentPush = asset.sentiment * 0.003;
    const noise = (market.rng() - 0.5) * asset.volatility;
    const drift = asset.drift + sentimentPush;
    const change = drift + noise;
    const nextPrice = Math.max(0.05, asset.price * (1 + change));

    asset.price = nextPrice;
    decaySentiment(asset);

    asset.history.push(nextPrice);
    if (asset.history.length > 120) {
      asset.history.shift();
    }
  });
}

export function applyMarketEvent(market, event) {
  market.lastEvent = event;
  market.assets.forEach((asset) => {
    if (event.tags.includes(asset.id) || event.tags.includes(asset.type)) {
      asset.sentiment += event.impact;
    }
  });
}

export function getAssetsByType(market, type) {
  return market.assets.filter((asset) => asset.type === type);
}

export function getAssetById(market, id) {
  return market.assets.find((asset) => asset.id === id);
}
