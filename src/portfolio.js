import { formatMoney } from "./state.js";

export function createPortfolio(initialCash) {
  return {
    cash: initialCash,
    positions: {},
    dailyExpense: 220,
    feeRate: 0.0025,
  };
}

export function buyAsset(portfolio, asset, amount) {
  const cost = asset.price * amount;
  const fee = cost * portfolio.feeRate;
  const total = cost + fee;
  if (portfolio.cash < total) {
    return { ok: false, message: "Not enough cash." };
  }

  const position = portfolio.positions[asset.id] || {
    id: asset.id,
    amount: 0,
    avgPrice: 0,
  };

  const newAmount = position.amount + amount;
  const newCost = position.avgPrice * position.amount + cost;

  position.amount = newAmount;
  position.avgPrice = newCost / newAmount;
  portfolio.positions[asset.id] = position;
  portfolio.cash -= total;

  return { ok: true, message: `Bought ${amount} ${asset.id}.` };
}

export function sellAsset(portfolio, asset, amount) {
  const position = portfolio.positions[asset.id];
  if (!position || position.amount < amount) {
    return { ok: false, message: "Not enough holdings." };
  }

  const revenue = asset.price * amount;
  const fee = revenue * portfolio.feeRate;
  portfolio.cash += revenue - fee;
  position.amount -= amount;

  if (position.amount <= 0) {
    delete portfolio.positions[asset.id];
  }

  return { ok: true, message: `Sold ${amount} ${asset.id}.` };
}

export function applyDailyExpense(portfolio) {
  portfolio.cash = Math.max(0, portfolio.cash - portfolio.dailyExpense);
}

export function portfolioSnapshot(portfolio, assets) {
  return Object.values(portfolio.positions).map((position) => {
    const asset = assets.find((item) => item.id === position.id);
    const value = asset ? asset.price * position.amount : 0;
    const cost = position.avgPrice * position.amount;
    return {
      ...position,
      value,
      cost,
      pnl: value - cost,
    };
  });
}
