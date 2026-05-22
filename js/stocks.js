/* ============================================================
   InvestIQ - Stock Engine
   Twelve Data API for real prices + simulation fallback
   ============================================================ */

const STOCKS = [
  { id: 'RELIANCE',  symbol: 'RELIANCE',  name: 'Reliance Global',       realSymbol: 'RELIANCE.NS',  basePrice: 2450, sector: 'Energy' },
  { id: 'INFOVISTA', symbol: 'INFOVISTA', name: 'InfoVista Ltd',         realSymbol: 'INFY.NS',      basePrice: 1580, sector: 'IT' },
  { id: 'HORIZON',   symbol: 'HORIZON',   name: 'Horizon Bank',          realSymbol: 'HDFCBANK.NS',   basePrice: 1620, sector: 'Banking' },
  { id: 'TATADRIVE', symbol: 'TATADRIVE', name: 'TataDrives Motors',     realSymbol: 'TATAMOTORS.NS', basePrice: 780,  sector: 'Auto' },
  { id: 'SOVEREIGN', symbol: 'SOVEREIGN',  name: 'Sovereign Bank',       realSymbol: 'SBIN.NS',       basePrice: 620,  sector: 'Banking' },
  { id: 'NEXUS',     symbol: 'NEXUS',     name: 'Nexus Bank',            realSymbol: 'ICICIBANK.NS',   basePrice: 1050, sector: 'Banking' },
  { id: 'SKYLINK',   symbol: 'SKYLINK',   name: 'SkyLink Telecom',      realSymbol: 'BHARTIARTL.NS',  basePrice: 1380, sector: 'Telecom' },
  { id: 'CHROMA',    symbol: 'CHROMA',    name: 'ChromaCoat Industries', realSymbol: 'ASIANPAINT.NS',  basePrice: 2950, sector: 'Paints' },
  { id: 'TCSDIGI',   symbol: 'TCSDIGI',   name: 'TCS Digital',           realSymbol: 'TCS.NS',        basePrice: 3680, sector: 'IT' },
  { id: 'IMPERIAL',  symbol: 'IMPERIAL',  name: 'Imperial Brands Ltd',   realSymbol: 'ITC.NS',        basePrice: 460,  sector: 'FMCG' },
];

let stockState = {};
let priceHistory = {};       // { stockId: [ { timestamp, open, high, low, close, volume } ] }
let apiHistory = {};          // { stockId: { data, fetchedAt } }
let updateInterval = null;
let apiRefreshInterval = null;
let usingRealPrices = false;

// ---- Initialise ----
function initStocks() {
  const savedState = localStorage.getItem('investiq_stock_state');
  const savedHistory = localStorage.getItem('investiq_price_history');

  if (savedState) {
    try { stockState = JSON.parse(savedState); } catch (e) { stockState = {}; }
  }
  if (savedHistory) {
    try { priceHistory = JSON.parse(savedHistory); } catch (e) { priceHistory = {}; }
  }

  STOCKS.forEach(stock => {
    if (!stockState[stock.id]) stockState[stock.id] = createInitialStockState(stock);
    if (!priceHistory[stock.id]) priceHistory[stock.id] = generateSimulationHistory(stock);
  });

  saveState();
  startSimulation();

  // Try to fetch real prices
  fetchRealPrices();
  // Refresh real prices every 5 min
  apiRefreshInterval = setInterval(fetchRealPrices, 300000);
}

function createInitialStockState(stock) {
  const price = addNoise(stock.basePrice, 0.02);
  const prevClose = addNoise(stock.basePrice, 0.03);
  const dayOpen = addNoise(stock.basePrice, 0.01);
  return {
    id: stock.id, symbol: stock.symbol, name: stock.name, sector: stock.sector,
    price: round2(price), prevClose: round2(prevClose), dayOpen: round2(dayOpen),
    dayHigh: round2(Math.max(price, dayOpen) * (1 + Math.random() * 0.015)),
    dayLow: round2(Math.min(price, dayOpen) * (1 - Math.random() * 0.015)),
    volume: Math.floor(100000 + Math.random() * 900000),
    lastUpdate: Date.now()
  };
}

// ---- Simulation: generates 90 daily candles + today's intraday ticks ----
function generateSimulationHistory(stock) {
  const daily = [];
  let price = stock.basePrice;
  const now = Date.now();

  // 90 daily candles
  for (let i = 90; i >= 1; i--) {
    const volatility = 0.015 + Math.random() * 0.01;
    const drift = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = round2(price * (1 + drift));
    const high = round2(Math.max(open, close) * (1 + Math.random() * 0.008));
    const low = round2(Math.min(open, close) * (1 - Math.random() * 0.008));
    const volume = Math.floor(100000 + Math.random() * 900000);
    daily.push({ timestamp: now - i * 86400000, open, high, low, close, volume });
    price = close;
  }

  // Today's intraday ticks (every 15 min for 6.5 hours = 26 ticks)
  const today = [];
  let todayPrice = price;
  const dayStart = new Date(); dayStart.setHours(9, 15, 0, 0);
  for (let m = 0; m < 26; m++) {
    const t = dayStart.getTime() + m * 15 * 60000;
    if (t > Date.now()) break;
    const v = 0.002 + Math.random() * 0.003;
    const d = (Math.random() - 0.5) * 2 * v;
    const prev = today.length > 0 ? today[today.length - 1].close : todayPrice;
    const open = prev;
    const close = round2(prev * (1 + d));
    const high = round2(Math.max(open, close) * (1 + Math.random() * 0.003));
    const low = round2(Math.min(open, close) * (1 - Math.random() * 0.003));
    today.push({ timestamp: t, open, high, low, close, volume: Math.floor(5000 + Math.random() * 20000) });
    todayPrice = close;
  }

  return { daily, intraday: today };
}

// ---- Simulation tick (every 3s) ----
function startSimulation() {
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(updateAllPrices, 3000);
}

function stopSimulation() { if (updateInterval) { clearInterval(updateInterval); updateInterval = null; } }

function updateAllPrices() {
  STOCKS.forEach(stock => {
    const s = stockState[stock.id];
    if (!s) return;
    const vol = 0.002 + Math.random() * 0.004;
    const mr = (stock.basePrice - s.price) / stock.basePrice * 0.005;
    const drift = mr + (Math.random() - 0.5) * 2 * vol;
    const oldPrice = s.price;
    s.price = round2(s.price * (1 + drift));
    s.dayHigh = round2(Math.max(s.dayHigh, s.price));
    s.dayLow = round2(Math.min(s.dayLow, s.price));
    s.volume += Math.floor(Math.random() * 3000);
    s.lastUpdate = Date.now();

    // Append tick to intraday history
    const hist = priceHistory[stock.id];
    if (hist && hist.intraday) {
      const last = hist.intraday[hist.intraday.length - 1];
      if (last) {
        last.close = s.price;
        last.high = Math.max(last.high, s.price);
        last.low = Math.min(last.low, s.price);
        last.volume += Math.floor(Math.random() * 200);
      }
      // New tick every ~5 min of sim
      if (Date.now() - last.timestamp > 300000) {
        hist.intraday.push({
          timestamp: Date.now(), open: s.price, high: s.price,
          low: s.price, close: s.price, volume: Math.floor(Math.random() * 3000)
        });
      }
    }
  });
  saveState();
  window.dispatchEvent(new CustomEvent('stockUpdate', { detail: stockState }));
}

// ---- Twelve Data API ----
async function fetchRealPrices() {
  const apiKey = window.__INVESTIQ_TWELVEDATA_KEY__ || '';
  if (!apiKey || apiKey === 'YOUR_TWELVE_DATA_KEY') return;

  const symbols = STOCKS.map(s => s.realSymbol).join(',');
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'error') { console.warn('Twelve Data error:', data.message); return; }

    STOCKS.forEach(stock => {
      const q = data[stock.realSymbol];
      if (!q || q.status === 'error') return;

      const s = stockState[stock.id];
      if (!s) return;

      const price = parseFloat(q.close) || s.price;
      s.price = round2(price);
      s.prevClose = round2(parseFloat(q.previous_close) || s.prevClose);
      s.dayOpen = round2(parseFloat(q.open) || s.dayOpen);
      s.dayHigh = round2(parseFloat(q.high) || s.dayHigh);
      s.dayLow = round2(parseFloat(q.low) || s.dayLow);
      s.volume = parseInt(q.volume) || s.volume;
      s.lastUpdate = Date.now();

      // Update basePrice for simulation mean-reversion
      stock.basePrice = price;
    });

    usingRealPrices = true;
    saveState();
    window.dispatchEvent(new CustomEvent('stockUpdate', { detail: stockState }));
    console.log('Real prices loaded from Twelve Data');
  } catch (e) {
    console.warn('Failed to fetch real prices:', e);
  }
}

async function fetchRealHistory(stockId) {
  const stock = STOCKS.find(s => s.id === stockId);
  if (!stock) return null;

  const apiKey = window.__INVESTIQ_TWELVEDATA_KEY__ || '';
  if (!apiKey || apiKey === 'YOUR_TWELVE_DATA_KEY') return null;

  // Check cache (1 hour)
  if (apiHistory[stockId] && Date.now() - apiHistory[stockId].fetchedAt < 3600000) {
    return apiHistory[stockId].data;
  }

  try {
    // Fetch 3 months of daily data
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(stock.realSymbol)}&interval=1day&outputsize=90&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'error') { console.warn('Twelve Data history error:', data.message); return null; }

    const candles = (data.values || []).map(v => ({
      timestamp: new Date(v.datetime).getTime(),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume) || 0
    })).reverse();

    if (candles.length > 0) {
      // Convert to our format
      const daily = candles;
      // Generate synthetic intraday from last day's candle
      const lastCandle = daily[daily.length - 1];
      const intraday = generateIntradayFromCandle(lastCandle);

      priceHistory[stockId] = { daily, intraday };
      apiHistory[stockId] = { data: priceHistory[stockId], fetchedAt: Date.now() };
      saveState();
      return priceHistory[stockId];
    }
  } catch (e) {
    console.warn('Failed to fetch history:', e);
  }
  return null;
}

function generateIntradayFromCandle(candle) {
  const ticks = [];
  const range = candle.high - candle.low;
  const dayStart = new Date(candle.timestamp); dayStart.setHours(9, 15, 0, 0);
  let price = candle.open;
  for (let m = 0; m < 26; m++) {
    const t = dayStart.getTime() + m * 15 * 60000;
    const d = (Math.random() - 0.5) * range * 0.08;
    const open = price;
    const close = round2(price + d);
    const high = round2(Math.max(open, close) + Math.random() * range * 0.02);
    const low = round2(Math.min(open, close) - Math.random() * range * 0.02);
    ticks.push({ timestamp: t, open, high, low, close, volume: Math.floor(5000 + Math.random() * 20000) });
    price = close;
  }
  return ticks;
}

// ---- Accessors ----
function getStockState() { return stockState; }
function getStockById(id) { return stockState[id] || null; }
function getChangePercent(id) { const s = stockState[id]; return s ? round2(((s.price - s.prevClose) / s.prevClose) * 100) : 0; }
function getChangeValue(id) { const s = stockState[id]; return s ? round2(s.price - s.prevClose) : 0; }

function getPriceHistory(stockId) { return priceHistory[stockId] || { daily: [], intraday: [] }; }

// ---- Helpers ----
function round2(n) { return Math.round(n * 100) / 100; }
function addNoise(v, f) { return v * (1 + (Math.random() - 0.5) * 2 * f); }
function saveState() {
  try { localStorage.setItem('investiq_stock_state', JSON.stringify(stockState)); localStorage.setItem('investiq_price_history', JSON.stringify(priceHistory)); } catch (e) {}
}
function formatPrice(price) { return '\u20B9' + Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatVolume(vol) { if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M'; if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K'; return String(vol); }
function formatChange(change, pct) { const sign = change >= 0 ? '+' : ''; return `${sign}${change.toFixed(2)} (${sign}${pct.toFixed(2)}%)`; }
