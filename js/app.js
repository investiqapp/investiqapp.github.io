/* ============================================================
   InvestIQ - Main Application Controller
   ============================================================ */

let appInitialized = false;

function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  initStocks();
  initPortfolio();
  initCharts();
  initEducation();
  initPWA();

  renderStockList();
  updateSummaryPage();
  setupNavigation();

  window.addEventListener('stockUpdate', (e) => {
    updateStockList(e.detail);
    if (selectedStockId) { const s = getStockById(selectedStockId); if (s) updateStockDetail(s); }
  });

  window.addEventListener('resize', debounce(() => { if (selectedStockId) drawStockChart(selectedStockId); }, 250));

  document.getElementById('stock-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.stock-item').forEach(item => {
      const sym = item.querySelector('.stock-symbol').textContent.toLowerCase();
      const nm = item.querySelector('.stock-name').textContent.toLowerCase();
      item.style.display = (sym.includes(q) || nm.includes(q)) ? '' : 'none';
    });
  });
}

function setupNavigation() {
  document.querySelectorAll('.nav-tab, .bottom-tab').forEach(tab => {
    tab.addEventListener('click', () => navigateTo(tab.dataset.page));
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-tab, .bottom-tab').forEach(t => t.classList.toggle('active', t.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  if (page === 'summary') { updateSummaryPage(); setTimeout(drawPnLChart, 100); }
  else if (page === 'dashboard' && selectedStockId) { setTimeout(() => drawStockChart(selectedStockId), 100); }
  // On mobile, if switching to dashboard, close detail view
  if (page === 'dashboard') document.querySelector('.dashboard-layout').classList.remove('mobile-detail-open');
}

function renderStockList() {
  const state = getStockState();
  document.getElementById('stock-list').innerHTML = STOCKS.map(stock => {
    const s = state[stock.id]; if (!s) return '';
    const ch = getChangeValue(stock.id), cp = getChangePercent(stock.id), isUp = ch >= 0;
    return `<div class="stock-item" data-stock-id="${stock.id}" onclick="selectStock('${stock.id}')">
      <div class="stock-item-left"><span class="stock-symbol">${s.symbol}</span><span class="stock-name">${s.name}</span></div>
      <div class="stock-item-right"><span class="stock-price">${formatPrice(s.price)}</span><span class="stock-change ${isUp?'up':'down'}">${isUp?'+':''}${ch.toFixed(2)} (${isUp?'+':''}${cp.toFixed(2)}%)</span></div>
    </div>`;
  }).join('');
}

function updateStockList(state) {
  STOCKS.forEach(stock => {
    const s = state[stock.id]; if (!s) return;
    const item = document.querySelector(`.stock-item[data-stock-id="${stock.id}"]`); if (!item) return;
    const ch = getChangeValue(stock.id), cp = getChangePercent(stock.id), isUp = ch >= 0;
    const priceEl = item.querySelector('.stock-price'), changeEl = item.querySelector('.stock-change');
    const oldP = parseFloat(priceEl.textContent.replace(/[\u20B9,]/g, '')), newP = s.price;
    priceEl.textContent = formatPrice(s.price);
    changeEl.textContent = `${isUp?'+':''}${ch.toFixed(2)} (${isUp?'+':''}${cp.toFixed(2)}%)`;
    changeEl.className = `stock-change ${isUp?'up':'down'}`;
    if (Math.abs(newP - oldP) > 0.01) { item.classList.remove('flash-up','flash-down'); void item.offsetWidth; item.classList.add(newP > oldP ? 'flash-up' : 'flash-down'); }
  });
}

function updateSummaryPage() {
  const balance = db.local.getBalance();
  const pv = getPortfolioValue(), pnl = getTotalPnL();
  document.getElementById('summary-balance').textContent = formatPrice(balance);
  document.getElementById('summary-portfolio-value').textContent = formatPrice(pv);
  const pnlEl = document.getElementById('summary-pnl');
  pnlEl.textContent = (pnl >= 0 ? '+' : '') + formatPrice(pnl);
  pnlEl.style.color = pnl >= 0 ? 'var(--trading-up)' : 'var(--trading-down)';
  renderHoldingsTable();
  renderTransactions();
}

function renderHoldingsTable() {
  const tbody = document.getElementById('holdings-tbody');
  const holdings = db.local.getHoldings();
  const ids = Object.keys(holdings);
  if (ids.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No holdings yet. Start trading!</td></tr>'; return; }
  tbody.innerHTML = ids.map(id => {
    const h = holdings[id], s = getStockById(id); if (!s) return '';
    const cur = h.quantity * s.price, inv = h.quantity * h.avgPrice, pl = cur - inv, isUp = pl >= 0;
    return `<tr><td><strong style="color:var(--on-dark)">${s.symbol}</strong><div style="font-size:11px;color:var(--muted);font-family:var(--font-body)">${s.name}</div></td><td>${h.quantity}</td><td>${formatPrice(h.avgPrice)}</td><td>${formatPrice(s.price)}</td><td class="${isUp?'trading-up':'trading-down'}">${isUp?'+':''}${formatPrice(pl)}</td></tr>`;
  }).join('');
}

function renderTransactions() {
  const container = document.getElementById('txn-list');
  const txns = db.local.getTransactions();
  if (txns.length === 0) { container.innerHTML = '<div class="empty-state">No transactions yet</div>'; return; }
  container.innerHTML = txns.slice(0, 10).map(t => {
    const isBuy = t.type === 'BUY';
    const time = new Date(t.timestamp);
    return `<div class="txn-item">
      <div class="txn-item-left"><span class="txn-type-badge ${isBuy?'buy':'sell'}">${t.type}</span><div><div class="txn-stock">${t.symbol||t.stockId}</div><div class="txn-detail">${t.quantity} shares @ ${formatPrice(t.price)}</div></div></div>
      <div class="txn-item-right"><div class="txn-total">${isBuy?'-':'+'} ${formatPrice(t.total)}</div><div class="txn-time">${time.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} ${time.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></div>
    </div>`;
  }).join('');
}

function showToast(message, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = message;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

document.addEventListener('DOMContentLoaded', () => initAuth());
