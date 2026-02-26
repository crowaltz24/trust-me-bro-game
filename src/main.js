import { loadState, saveState, loadRun, saveRun, clearRun, formatMoney, formatTimer } from "./state.js";
import {
  createMarket,
  restoreMarket,
  tickMarket,
  getAssetById,
  getAssetsByType,
  applyMarketEvent,
} from "./market.js";
import {
  createPortfolio,
  buyAsset,
  sellAsset,
  applyDailyExpense,
  portfolioSnapshot,
} from "./portfolio.js";
import { getCharacters, getAdvice, buildAdvicePrompt } from "./characters.js";
import { generateFeed } from "./newsFeed.js";

const ui = {
  dayCount: document.getElementById("day-count"),
  dayTimer: document.getElementById("day-timer"),
  cashBalance: document.getElementById("cash-balance"),
  pauseBtn: document.getElementById("pause-btn"),
  settingsBtn: document.getElementById("settings-btn"),
  settingsPanel: document.getElementById("phone-settings"),
  settingsClose: document.getElementById("settings-close"),
  settingsMenu: document.getElementById("settings-menu"),
  settingsReset: document.getElementById("settings-reset"),
  tabs: document.querySelectorAll(".tab"),
  chart: document.getElementById("price-chart"),
  activeAsset: document.getElementById("active-asset"),
  assetDescription: document.getElementById("asset-description"),
  assetPrice: document.getElementById("asset-price"),
  assetSentiment: document.getElementById("asset-sentiment"),
  assetVolatility: document.getElementById("asset-volatility"),
  assetSelect: document.getElementById("asset-select"),
  tradeAmount: document.getElementById("trade-amount"),
  buyBtn: document.getElementById("buy-btn"),
  sellBtn: document.getElementById("sell-btn"),
  portfolioList: document.getElementById("portfolio-list"),
  portfolioTotal: document.getElementById("portfolio-total"),
  phoneTabs: document.querySelectorAll(".phone-tab"),
  phonePanels: document.querySelectorAll(".phone-panel"),
  chatTab: document.getElementById("chat-tab"),
  contactList: document.getElementById("contact-list"),
  chatListView: document.getElementById("chat-list-view"),
  chatThreadView: document.getElementById("chat-thread-view"),
  backToContacts: document.getElementById("back-to-contacts"),
  chatContactName: document.getElementById("chat-contact-name"),
  chatContactStyle: document.getElementById("chat-contact-style"),
  chatLog: document.getElementById("chat-log"),
  adviceBtn: document.getElementById("advice-btn"),
  followBtn: document.getElementById("follow-btn"),
  feedList: document.getElementById("feed-list"),
  refreshFeed: document.getElementById("refresh-feed"),
  toastStack: document.getElementById("toast-stack"),
  dayModal: document.getElementById("day-modal"),
  dayModalTitle: document.getElementById("day-modal-title"),
  dayStartBtn: document.getElementById("day-start-btn"),
};

const START_MODE_KEY = "meme-market-start";
const startMode = sessionStorage.getItem(START_MODE_KEY);
const isNewGame = startMode === "new";
if (isNewGame) {
  clearRun();
  sessionStorage.removeItem(START_MODE_KEY);
}
const savedRun = loadRun();
let state = savedRun?.state ? { ...loadState(), ...savedRun.state } : loadState();
let market = savedRun?.market ? restoreMarket(savedRun.market, state.seed) : createMarket(state.seed);
let portfolio = savedRun?.portfolio ? savedRun.portfolio : createPortfolio(state.cash);
if (portfolio?.cash != null) {
  state.cash = portfolio.cash;
}
const characters = getCharacters();
let latestAdvice = null;
let tickHandle = null;
let activeContactId = null;
const chatHistory = new Map();
const unreadCounts = new Map();
const latestAdviceByContact = new Map();
let feedItems = [];
let feedCounter = 0;
let feedVisibleCount = 0;
let chatTimer = null;
let feedTimer = null;
const chatPing = new Audio("/assets/notification.mp3");
chatPing.volume = 0.55;

function setActiveTab(tab) {
  state.activeTab = tab;
  ui.tabs.forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  const assets = populateAssetSelect();
  const nextAsset = assets.find((asset) => asset.id === state.activeAssetId) || assets[0];
  if (nextAsset) {
    updateActiveAsset(nextAsset.id);
  }
}

function populateAssetSelect() {
  const assets = getAssetsByType(market, state.activeTab);
  ui.assetSelect.innerHTML = "";
  assets.forEach((asset) => {
    const option = document.createElement("option");
    option.value = asset.id;
    option.textContent = `${asset.id} - ${asset.description}`;
    if (asset.id === state.activeAssetId) {
      option.selected = true;
    }
    ui.assetSelect.appendChild(option);
  });
  return assets;
}

function setPhoneTab(tab) {
  ui.phoneTabs.forEach((button) => button.classList.toggle("active", button.dataset.phone === tab));
  ui.phonePanels.forEach((panel) => panel.classList.toggle("active", panel.id === `phone-${tab}`));
}

function updateActiveAsset(assetId) {
  const asset = getAssetById(market, assetId) || market.assets[0];
  state.activeAssetId = asset.id;
  ui.activeAsset.textContent = asset.id;
  ui.assetDescription.textContent = asset.description;
  ui.assetPrice.textContent = formatMoney(asset.price);
  ui.assetSentiment.textContent = asset.sentiment.toFixed(2);
  ui.assetVolatility.textContent = asset.volatility.toFixed(3);
  drawChart(asset.history);
}

function drawChart(history) {
  const ctx = ui.chart.getContext("2d");
  const w = ui.chart.width;
  const h = ui.chart.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const min = Math.min(...history);
  const max = Math.max(...history);
  const pad = (max - min) * 0.2 || 1;
  const scaledMin = min - pad;
  const scaledMax = max + pad;

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((value, idx) => {
    const x = (idx / (history.length - 1)) * (w - 20) + 10;
    const y = h - ((value - scaledMin) / (scaledMax - scaledMin)) * (h - 20) - 10;
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function renderPortfolio() {
  const snapshots = portfolioSnapshot(portfolio, market.assets);
  const existingRows = new Map(
    Array.from(ui.portfolioList.querySelectorAll(".row")).map((row) => [row.dataset.asset, row])
  );
  const totalPnl = snapshots.reduce((sum, position) => sum + position.pnl, 0);
  if (ui.portfolioTotal) {
    const totalLabel = totalPnl >= 0 ? `+${formatMoney(totalPnl)}` : formatMoney(totalPnl);
    ui.portfolioTotal.textContent = totalLabel;
    applyPnlClass(ui.portfolioTotal, totalPnl);
  }
  if (snapshots.length === 0) {
    ui.portfolioList.innerHTML = "";
    ui.portfolioList.textContent = "No positions yet.";
    return;
  }
  snapshots.forEach((position) => {
    const pnl = position.pnl >= 0 ? `+${formatMoney(position.pnl)}` : formatMoney(position.pnl);
    let row = existingRows.get(position.id);
    if (!row) {
      row = document.createElement("div");
      row.className = "row";
      row.dataset.asset = position.id;
      row.innerHTML = `
        <div class="row-main">
          <span class="row-asset"></span>
          <span class="row-pnl"></span>
        </div>
        <div class="row-actions">
          <input class="row-slider" type="range" min="1" step="1" value="1" />
          <span class="row-amount-value">1</span>
          <button class="row-exec">Sell</button>
        </div>
      `;
      ui.portfolioList.appendChild(row);
    }
    const slider = row.querySelector(".row-slider");
    const amountValue = row.querySelector(".row-amount-value");
    const currentValue = Number(slider.value) || 1;
    slider.max = String(position.amount);
    slider.value = String(Math.min(currentValue, position.amount));
    amountValue.textContent = slider.value;
    row.querySelector(".row-asset").textContent = `${position.id} (${position.amount})`;
    const pnlEl = row.querySelector(".row-pnl");
    pnlEl.textContent = pnl;
    applyPnlClass(pnlEl, position.pnl);
    existingRows.delete(position.id);
  });

  existingRows.forEach((row) => row.remove());
}

function applyPnlClass(element, value) {
  if (!element) {
    return;
  }
  element.classList.remove("pnl-positive", "pnl-negative", "pnl-neutral");
  if (value > 0) {
    element.classList.add("pnl-positive");
  } else if (value < 0) {
    element.classList.add("pnl-negative");
  } else {
    element.classList.add("pnl-neutral");
  }
}

function ensureChat(contactId) {
  if (!chatHistory.has(contactId)) {
    chatHistory.set(contactId, []);
  }
  if (!unreadCounts.has(contactId)) {
    unreadCounts.set(contactId, 0);
  }
}

function seedBabeChat() {
  ensureChat("babe");
  const messages = chatHistory.get("babe");
  if (messages.length === 0) {
    messages.push("You: I miss you.");
    messages.push("You: please  come back");
    messages.push("You: listen i can change");
    messages.push("You: Im outside");
    messages.push("You: I NEVER LOVED YOY AMYWAY")
  }
}

function setChatView(view) {
  ui.chatListView.classList.toggle("active", view === "list");
  ui.chatThreadView.classList.toggle("active", view === "thread");
}

function shouldPlayPing(text) {
  if (!text) {
    return false;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("You:")) {
    return false;
  }
  return !trimmed.startsWith("System:");
}

function playChatPing() {
  try {
    const sound = chatPing.cloneNode(true);
    sound.volume = chatPing.volume;
    sound.play();
  } catch (error) {
    // Ignore autoplay failures.
  }
}

function renderContacts() {
  ui.contactList.innerHTML = "";
  characters.forEach((character) => {
    ensureChat(character.id);
    const unread = unreadCounts.get(character.id) || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "contact-item";
    button.dataset.contactId = character.id;
    button.innerHTML = `
      <div>
        <div>${character.name}</div>
        <div class="contact-meta">${character.style}</div>
      </div>
      ${unread > 0 ? `<span class="contact-badge">${unread}</span>` : ""}
    `;
    ui.contactList.appendChild(button);
  });
  updateChatTabUnread();
}

function renderChat(contactId) {
  ensureChat(contactId);
  ui.chatLog.innerHTML = "";
  const messages = chatHistory.get(contactId) || [];
  messages.forEach((text) => {
    const div = document.createElement("div");
    div.className = "msg";
    div.textContent = text;
    ui.chatLog.appendChild(div);
  });
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}

function normalizeChatText(text) {
  if (!text) {
    return "";
  }
  return text.replace(/\s+/g, " ").trim();
}

async function fetchAdviceText(character, advice) {
  const { system, user } = buildAdvicePrompt(character, advice);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, user }),
    });
    if (!response.ok) {
      throw new Error(`LLM request failed (${response.status})`);
    }
    const data = await response.json();
    const text = normalizeChatText(data?.text);
    if (!text) {
      throw new Error("LLM returned empty text");
    }
    return text;
  } catch (error) {
    console.warn("LLM fallback:", error);
    return advice.text;
  }
}

function setActiveContact(contactId) {
  const contact = characters.find((item) => item.id === contactId);
  if (!contact) {
    return;
  }
  activeContactId = contactId;
  ui.chatContactName.textContent = contact.name;
  ui.chatContactStyle.textContent = contact.style;
  unreadCounts.set(contactId, 0);
  renderChat(contactId);
  renderContacts();
  const controlsDisabled = contactId === "babe";
  ui.adviceBtn.disabled = controlsDisabled;
  const adviceForContact = latestAdviceByContact.get(contactId);
  ui.followBtn.disabled = controlsDisabled || !adviceForContact;
  ui.adviceBtn.style.visibility = controlsDisabled ? "hidden" : "visible";
  ui.followBtn.style.visibility = controlsDisabled || !adviceForContact ? "hidden" : "visible";
  setChatView("thread");
}

function addChatMessage(text, contactId = activeContactId) {
  if (text.startsWith("System:")) {
    showToast(text.replace(/^System:\s*/, ""));
    return;
  }
  if (!contactId) {
    return;
  }
  if (shouldPlayPing(text)) {
    playChatPing();
  }
  ensureChat(contactId);
  const messages = chatHistory.get(contactId);
  messages.push(text);
  if (contactId !== activeContactId) {
    unreadCounts.set(contactId, (unreadCounts.get(contactId) || 0) + 1);
    renderContacts();
    return;
  }
  renderChat(contactId);
  updateChatTabUnread();
}

function showToast(message) {
  if (!ui.toastStack || !message) {
    return;
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  ui.toastStack.appendChild(toast);
  while (ui.toastStack.children.length > 3) {
    ui.toastStack.removeChild(ui.toastStack.firstChild);
  }
  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 3200);
}

function resetDailyChats({ seedBabe = true } = {}) {
  ui.chatLog.innerHTML = "";
  chatHistory.clear();
  unreadCounts.clear();
  latestAdviceByContact.clear();
  activeContactId = null;
  if (seedBabe) {
    seedBabeChat();
  }
  renderContacts();
  setChatView("list");
  ui.followBtn.disabled = true;
  ui.followBtn.style.visibility = "hidden";
  updateChatTabUnread();
}

function nudgeDailySentiment() {
  market.assets.forEach((asset) => {
    const drift = (market.rng() - 0.5) * 0.08;
    asset.sentiment += drift;
  });
}

function openDayModal(dayNumber) {
  if (!ui.dayModal) {
    return;
  }
  const label = `Begin day ${dayNumber}`;
  ui.dayModalTitle.textContent = label;
  ui.dayStartBtn.textContent = label;
  ui.dayModal.classList.add("active");
  ui.dayModal.setAttribute("aria-hidden", "false");
}

function closeDayModal() {
  if (!ui.dayModal) {
    return;
  }
  ui.dayModal.classList.remove("active");
  ui.dayModal.setAttribute("aria-hidden", "true");
}

function applyPauseState() {
  const isPaused = Boolean(state.isPaused);
  ui.buyBtn.disabled = isPaused;
  ui.sellBtn.disabled = isPaused;
  ui.pauseBtn.textContent = isPaused ? "Resume" : "Pause";
}

function renderFeed() {
  ui.feedList.innerHTML = "";
  feedItems.slice(0, feedVisibleCount).forEach((item) => {
    const div = document.createElement("div");
    div.className = "feed-item";
    if (item.pending) {
      div.classList.add("pending");
    }
    div.textContent = `${item.kind.toUpperCase()}: ${item.text}`;
    ui.feedList.appendChild(div);
  });
}

function updateChatTabUnread() {
  if (!ui.chatTab) {
    return;
  }
  let totalUnread = 0;
  unreadCounts.forEach((count) => {
    totalUnread += count || 0;
  });
  ui.chatTab.textContent = totalUnread > 0 ? `Chats (${totalUnread})` : "Chats";
}

function queueFeedItems(items, delayMs) {
  items.forEach((item) => {
    const queued = { ...item, id: feedCounter += 1, pending: true };
    feedItems.unshift(queued);
    setTimeout(() => {
      applyMarketEvent(market, queued);
      queued.pending = false;
      renderFeed();
    }, delayMs);
  });
  feedItems = feedItems.slice(0, 50);
  feedVisibleCount = Math.min(feedVisibleCount, feedItems.length);
  renderFeed();
}

function scheduleAdviceImpact(advice) {
  setTimeout(() => {
    applyMarketEvent(market, {
      kind: "advice",
      text: advice.text,
      impact: advice.impact,
      tags: [advice.assetId],
    });
  }, advice.delayMs);
}

function refreshFeed() {
  feedVisibleCount = feedItems.length;
  renderFeed();
}

function seedFeed() {
  const items = generateFeed(market.rng, market.assets).slice(0, 3);
  queueFeedItems(items, 2000);
  feedVisibleCount = feedItems.length;
  renderFeed();
}

function scheduleFeedPulse() {
  const delay = 6000 + Math.floor(market.rng() * 8000);
  feedTimer = setTimeout(() => {
    const items = generateFeed(market.rng, market.assets).slice(0, 2);
    const impactDelay = 2000 + Math.floor(market.rng() * 3000);
    queueFeedItems(items, impactDelay);
    scheduleFeedPulse();
  }, delay);
}

function scheduleChatPulse() {
  const delay = 8000 + Math.floor(market.rng() * 12000);
  chatTimer = setTimeout(async () => {
    const eligible = characters.filter((item) => item.id !== "babe");
    const character = eligible[Math.floor(market.rng() * eligible.length)];
    const advice = getAdvice(character, market, market.rng);
    const text = await fetchAdviceText(character, advice);
    advice.text = text;
    addChatMessage(`${character.name}: ${advice.text}`, character.id);
    latestAdviceByContact.set(character.id, advice);
    if (activeContactId === character.id) {
      ui.followBtn.disabled = false;
      ui.followBtn.style.visibility = "visible";
    }
    scheduleChatPulse();
  }, delay);
}

async function handleAdvice() {
  const character = characters.find((item) => item.id === activeContactId);
  if (!character) {
    return;
  }
  ui.adviceBtn.disabled = true;
  latestAdvice = getAdvice(character, market, market.rng);
  const text = await fetchAdviceText(character, latestAdvice);
  latestAdvice.text = text;
  addChatMessage(`${character.name}: ${latestAdvice.text}`, character.id);
  scheduleAdviceImpact(latestAdvice);
  latestAdviceByContact.set(character.id, latestAdvice);
  if (activeContactId !== "babe") {
    ui.followBtn.disabled = false;
    ui.followBtn.style.visibility = "visible";
  }
  ui.adviceBtn.disabled = false;
}

function followAdvice() {
  const advice = latestAdviceByContact.get(activeContactId);
  if (!advice) {
    addChatMessage("System: No advice to follow.");
    return;
  }
  const asset = getAssetById(market, advice.assetId);
  if (!asset) {
    addChatMessage("System: Advice asset not found.");
    return;
  }

  const amount = Number(ui.tradeAmount.value) || 1;
  let result = null;
  if (advice.intent === "sell" || advice.intent === "short") {
    result = sellAsset(portfolio, asset, amount);
  } else {
    result = buyAsset(portfolio, asset, amount);
  }
  addChatMessage(`System: ${result.message}`);
  latestAdviceByContact.delete(activeContactId);
  latestAdvice = null;
  ui.followBtn.disabled = true;
  ui.followBtn.style.visibility = "hidden";
  updateHud();
}

function updateHud() {
  ui.dayCount.textContent = String(state.dayCount);
  const remaining = Math.max(0, state.daySeconds - state.elapsedToday);
  ui.dayTimer.textContent = formatTimer(remaining);
  ui.cashBalance.textContent = formatMoney(portfolio.cash);
  renderPortfolio();
  updateActiveAsset(state.activeAssetId);
}

function buildRunSnapshot() {
  return {
    savedAt: Date.now(),
    state: { ...state, cash: portfolio.cash },
    market: {
      assets: market.assets,
      lastEvent: market.lastEvent,
    },
    portfolio,
  };
}

function tick() {
  if (state.isPaused) {
    return;
  }
  state.elapsedToday += 1;
  tickMarket(market);

  if (state.elapsedToday >= state.daySeconds) {
    state.elapsedToday = 0;
    state.dayCount += 1;
    applyDailyExpense(portfolio);
    addChatMessage(`System: Daily expenses charged $${portfolio.dailyExpense}.`);
    saveRun(buildRunSnapshot());
    showToast("Game saved!");
    state.isPaused = true;
    applyPauseState();
    openDayModal(state.dayCount);
  }

  updateHud();
  saveState({ ...state, cash: portfolio.cash });
}

function init() {
  seedBabeChat();
  renderContacts();
  setActiveTab(state.activeTab);
  setPhoneTab("chat");
  setChatView("list");
  ui.followBtn.disabled = true;
  ui.followBtn.style.visibility = "hidden";
  updateHud();
  applyPauseState();
  seedFeed();
  scheduleFeedPulse();
  scheduleChatPulse();

  ui.tabs.forEach((button) =>
    button.addEventListener("click", () => setActiveTab(button.dataset.tab))
  );

  ui.phoneTabs.forEach((button) =>
    button.addEventListener("click", () => setPhoneTab(button.dataset.phone))
  );

  ui.contactList.addEventListener("click", (event) => {
    const button = event.target.closest(".contact-item");
    if (!button) {
      return;
    }
    setActiveContact(button.dataset.contactId);
  });

  ui.backToContacts.addEventListener("click", () => setChatView("list"));

  ui.assetSelect.addEventListener("change", (event) => {
    updateActiveAsset(event.target.value);
  });

  ui.buyBtn.addEventListener("click", () => {
    const asset = getAssetById(market, ui.assetSelect.value);
    const amount = Number(ui.tradeAmount.value) || 1;
    const result = buyAsset(portfolio, asset, amount);
    addChatMessage(`System: ${result.message}`);
    updateHud();
  });

  ui.sellBtn.addEventListener("click", () => {
    const asset = getAssetById(market, ui.assetSelect.value);
    const amount = Number(ui.tradeAmount.value) || 1;
    const result = sellAsset(portfolio, asset, amount);
    addChatMessage(`System: ${result.message}`);
    updateHud();
  });

  ui.portfolioList.addEventListener("input", (event) => {
    const slider = event.target.closest(".row-slider");
    if (!slider) {
      return;
    }
    const row = slider.closest(".row");
    const amountValue = row?.querySelector(".row-amount-value");
    if (amountValue) {
      amountValue.textContent = slider.value;
    }
  });

  ui.portfolioList.addEventListener("click", (event) => {
    const button = event.target.closest(".row-exec");
    if (!button) {
      return;
    }
    const row = button.closest(".row");
    const assetId = row?.dataset.asset;
    const amount = Number(row?.querySelector(".row-slider")?.value) || 1;
    const asset = getAssetById(market, assetId);
    if (!asset) {
      return;
    }
    const result = sellAsset(portfolio, asset, amount);
    addChatMessage(`System: ${result.message}`);
    updateHud();
  });

  ui.adviceBtn.addEventListener("click", handleAdvice);
  ui.followBtn.addEventListener("click", followAdvice);
  ui.refreshFeed.addEventListener("click", refreshFeed);

  ui.pauseBtn.addEventListener("click", () => {
    state.isPaused = !state.isPaused;
    applyPauseState();
  });

  if (ui.dayStartBtn) {
    ui.dayStartBtn.addEventListener("click", () => {
      resetDailyChats();
      nudgeDailySentiment();
      closeDayModal();
      state.isPaused = false;
      applyPauseState();
      updateHud();
    });
  }

  const resetRun = () => {
    clearRun();
    state = loadState();
    market = createMarket(state.seed);
    portfolio = createPortfolio(state.cash);
    latestAdvice = null;
    ui.chatLog.innerHTML = "";
    chatHistory.clear();
    unreadCounts.clear();
    latestAdviceByContact.clear();
    feedItems = [];
    feedCounter = 0;
    feedVisibleCount = 0;
    if (chatTimer) {
      clearTimeout(chatTimer);
    }
    if (feedTimer) {
      clearTimeout(feedTimer);
    }
    seedBabeChat();
    renderContacts();
    setChatView("list");
    setActiveTab(state.activeTab);
    updateActiveAsset(state.activeAssetId);
    ui.tradeAmount.value = 10;
    seedFeed();
    scheduleFeedPulse();
    scheduleChatPulse();
    updateHud();
    applyPauseState();
  };

  ui.settingsBtn.addEventListener("click", () => {
    ui.settingsPanel.classList.toggle("active");
  });

  ui.settingsClose.addEventListener("click", () => {
    ui.settingsPanel.classList.remove("active");
  });

  if (ui.settingsMenu) {
    ui.settingsMenu.addEventListener("click", () => {
      saveRun(buildRunSnapshot());
      saveState({ ...state, cash: portfolio.cash });
      ui.settingsPanel.classList.remove("active");
      window.location.href = "/";
    });
  }

  ui.settingsReset.addEventListener("click", () => {
    ui.settingsPanel.classList.remove("active");
    resetRun();
  });

  tickHandle = setInterval(tick, state.tickMs);
}

init();
