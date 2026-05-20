/* ============================================================
   STRIDES - Stock Simulation Engine
   Generates realistic-ish stock price movements
   ============================================================ */

const STOCKS = [
  { id: 'RELIANCE',  symbol: 'RELIANCE',  name: 'Reliance Global',       basePrice: 2450, sector: 'Energy' },
  { id: 'INFOVISTA', symbol: 'INFOVISTA', name: 'InfoVista Ltd',         basePrice: 1580, sector: 'IT' },
  { id: 'HORIZON',   symbol: 'HORIZON',   name: 'Horizon Bank',          basePrice: 1620, sector: 'Banking' },
  { id: 'TATADRIVE', symbol: 'TATADRIVE', name: 'TataDrives Motors',     basePrice: 780,  sector: 'Auto' },
  { id: 'SOVEREIGN', symbol: 'SOVEREIGN',  name: 'Sovereign Bank',        basePrice: 620,  sector: 'Banking' },
  { id: 'NEXUS',     symbol: 'NEXUS',     name: 'Nexus Bank',            basePrice: 1050, sector: 'Banking' },
  { id: 'SKYLINK',   symbol: 'SKYLINK',   name: 'SkyLink Telecom',       basePrice: 1380, sector: 'Telecom' },
  { id: 'CHROMA',    symbol: 'CHROMA',    name: 'ChromaCoat Industries', basePrice: 2950, sector: 'Paints' },
  { id: 'TCSDIGI',   symbol: 'TCSDIGI',   name: 'TCS Digital',           basePrice: 3680, sector: 'IT' },
  { id: 'IMPERIAL',  symbol: 'IMPERIAL',  name: 'Imperial Brands Ltd',   basePrice: 460,  sector: 'FMCG' },
];

// Stock state store
let stockState = {};
let priceHistory = {};  // { stockId: [{ timestamp, open, high, low, close, volume }] }
let updateInterval = null;

function initStocks() {
  // Load from localStorage or initialize fresh
  const saved = localStorage.getItem('strides_stock_state');
  const savedHistory = localStorage.getItem('strides_price_history');

  if (saved) {
    try {
      stockState = JSON.parse(saved);
      priceHistory = savedHistory ? JSON.parse(savedHistory) : {};
    } catch (e) {
      stockState = {};
      priceHistory = {};
    }
  }

  // Initialize any missing stocks
  STOCKS.forEach(stock => {
    if (!stockState[stock.id]) {
      stockState[stock.id] = createInitialStockState(stock);
    }
    if (!priceHistory[stock.id]) {
      priceHistory[stock.id] = generateInitialHistory(stock);
    }
  });

  saveState();
  startSimulation();
}

function createInitialStockState(stock) {
  const price = addNoise(stock.basePrice, 0.02);
  const prevClose = addNoise(stock.basePrice, 0.03);
  const dayOpen = addNoise(stock.basePrice, 0.01);
  const dayHigh = Math.max(price, dayOpen) * (1 + Math.random() * 0.015);
  const dayLow = Math.min(price, dayOpen) * (1 - Math.random() * 0.015);

  return {
    id: stock.id,
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    price: round2(price),
    prevClose: round2(prevClose),
    dayOpen: round2(dayOpen),
    dayHigh: round2(dayHigh),
    dayLow: round2(dayLow),
    volume: Math.floor(100000 + Math.random() * 900000),
    lastUpdate: Date.now()
  };
}

function generateInitialHistory(stock) {
  // Generate ~30 days of historical data
  const history = [];
  let price = stock.basePrice;
  const now = Date.now();

  for (let i = 60; i >= 0; i--) {
    const volatility = 0.015 + Math.random() * 0.01;
    const drift = (Math.random() - 0.48) * volatility; // slight upward bias
    const open = price;
    const change = price * drift;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.008);
    const low = Math.min(open, close) * (1 - Math.random() * 0.008);
    const volume = Math.floor(100000 + Math.random() * 900000);

    history.push({
      timestamp: now - i * 3600000, // hourly
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume
    });

    price = close;
  }
  return history;
}

function startSimulation() {
  if (updateInterval) clearInterval(updateInterval);

  // Update prices every 3 seconds
  updateInterval = setInterval(() => {
    updateAllPrices();
  }, 3000);
}

function stopSimulation() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

function updateAllPrices() {
  STOCKS.forEach(stock => {
    const state = stockState[stock.id];
    if (!state) return;

    // Random walk with mean reversion
    const volatility = 0.003 + Math.random() * 0.005;
    const meanReversion = (stock.basePrice - state.price) / stock.basePrice * 0.01;
    const drift = meanReversion + (Math.random() - 0.5) * 2 * volatility;
    const oldPrice = state.price;
    const newPrice = round2(state.price * (1 + drift));

    state.price = newPrice;
    state.dayHigh = round2(Math.max(state.dayHigh, newPrice));
    state.dayLow = round2(Math.min(state.dayLow, newPrice));
    state.volume += Math.floor(Math.random() * 5000);
    state.lastUpdate = Date.now();

    // Add to price history (every update = a tick)
    if (!priceHistory[stock.id]) priceHistory[stock.id] = [];

    const history = priceHistory[stock.id];
    const lastEntry = history[history.length - 1];

    if (lastEntry) {
      // Update the current candle
      lastEntry.close = newPrice;
      lastEntry.high = Math.max(lastEntry.high, newPrice);
      lastEntry.low = Math.min(lastEntry.low, newPrice);
      lastEntry.volume += Math.floor(Math.random() * 500);

      // Create new candle every ~5 minutes of sim time
      if (Date.now() - lastEntry.timestamp > 300000) {
        history.push({
          timestamp: Date.now(),
          open: newPrice,
          high: newPrice,
          low: newPrice,
          close: newPrice,
          volume: Math.floor(Math.random() * 5000)
        });
      }
    }

    // Keep history bounded
    if (history.length > 500) {
      priceHistory[stock.id] = history.slice(-300);
    }
  });

  saveState();

  // Dispatch event for UI update
  window.dispatchEvent(new CustomEvent('stockUpdate', { detail: stockState }));
}

function getStockState() {
  return stockState;
}

function getStockById(id) {
  return stockState[id] || null;
}

function getPriceHistory(stockId) {
  return priceHistory[stockId] || [];
}

function getChangePercent(stockId) {
  const state = stockState[stockId];
  if (!state || !state.prevClose) return 0;
  return round2(((state.price - state.prevClose) / state.prevClose) * 100);
}

function getChangeValue(stockId) {
  const state = stockState[stockId];
  if (!state || !state.prevClose) return 0;
  return round2(state.price - state.prevClose);
}

// ---- Helpers ----
function round2(n) {
  return Math.round(n * 100) / 100;
}

function addNoise(value, factor) {
  return value * (1 + (Math.random() - 0.5) * 2 * factor);
}

function saveState() {
  try {
    localStorage.setItem('strides_stock_state', JSON.stringify(stockState));
    localStorage.setItem('strides_price_history', JSON.stringify(priceHistory));
  } catch (e) {
    console.warn('Could not save stock state to localStorage');
  }
}

function formatPrice(price) {
  return '₹' + Number(price).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatVolume(vol) {
  if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
  return String(vol);
}

function formatChange(change, pct) {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
}
