/* ============================================================
   STRIDES - Main Application Controller
   Routing, event handling, UI orchestration
   ============================================================ */

let appInitialized = false;

function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  console.log('Strides initializing...');

  // Initialize all modules
  initStocks();
  initPortfolio();
  initCharts();
  initEducation();
  initPWA();

  // Render initial UI
  renderStockList();
  updateSummaryPage();

  // Setup navigation
  setupNavigation();

  // Listen for stock updates
  window.addEventListener('stockUpdate', (e) => {
    updateStockList(e.detail);
    if (selectedStockId) {
      const stock = getStockById(selectedStockId);
      if (stock) updateStockDetail(stock);
    }
  });

  // Resize handler for charts
  window.addEventListener('resize', debounce(() => {
    if (selectedStockId) drawStockChart(selectedStockId);
  }, 250));

  // Search
  document.getElementById('stock-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.stock-item').forEach(item => {
      const symbol = item.querySelector('.stock-symbol').textContent.toLowerCase();
      const name = item.querySelector('.stock-name').textContent.toLowerCase();
      item.style.display = (symbol.includes(query) || name.includes(query)) ? '' : 'none';
    });
  });
}

function setupNavigation() {
  // Desktop nav tabs
  document.querySelectorAll('.nav-tab, .bottom-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const page = tab.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  // Update nav tabs
  document.querySelectorAll('.nav-tab, .bottom-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === page);
  });

  // Update pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });

  // Page-specific updates
  if (page === 'summary') {
    updateSummaryPage();
    setTimeout(drawPnLChart, 100);
  } else if (page === 'dashboard' && selectedStockId) {
    setTimeout(() => drawStockChart(selectedStockId), 100);
  }
}

function renderStockList() {
  const container = document.getElementById('stock-list');
  const state = getStockState();

  container.innerHTML = STOCKS.map(stock => {
    const s = state[stock.id];
    if (!s) return '';
    const change = getChangeValue(stock.id);
    const changePct = getChangePercent(stock.id);
    const isUp = change >= 0;

    return `
      <div class="stock-item" data-stock-id="${stock.id}" onclick="selectStock('${stock.id}')">
        <div class="stock-item-left">
          <span class="stock-symbol">${s.symbol}</span>
          <span class="stock-name">${s.name}</span>
        </div>
        <div class="stock-item-right">
          <span class="stock-price">${formatPrice(s.price)}</span>
          <span class="stock-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${change.toFixed(2)} (${isUp ? '+' : ''}${changePct.toFixed(2)}%)</span>
        </div>
      </div>
    `;
  }).join('');
}

function updateStockList(state) {
  // Efficiently update only prices and changes
  STOCKS.forEach(stock => {
    const s = state[stock.id];
    if (!s) return;
    const item = document.querySelector(`.stock-item[data-stock-id="${stock.id}"]`);
    if (!item) return;

    const change = getChangeValue(stock.id);
    const changePct = getChangePercent(stock.id);
    const isUp = change >= 0;

    const priceEl = item.querySelector('.stock-price');
    const changeEl = item.querySelector('.stock-change');

    const oldPrice = parseFloat(priceEl.textContent.replace(/[₹,]/g, ''));
    const newPrice = s.price;

    priceEl.textContent = formatPrice(s.price);
    changeEl.textContent = `${isUp ? '+' : ''}${change.toFixed(2)} (${isUp ? '+' : ''}${changePct.toFixed(2)}%)`;
    changeEl.className = `stock-change ${isUp ? 'up' : 'down'}`;

    // Flash effect on price change
    if (Math.abs(newPrice - oldPrice) > 0.01) {
      item.classList.remove('flash-up', 'flash-down');
      void item.offsetWidth; // force reflow
      item.classList.add(newPrice > oldPrice ? 'flash-up' : 'flash-down');
    }
  });
}

function updateSummaryPage() {
  const balance = db.local.getBalance();
  const portfolioValue = getPortfolioValue();
  const totalPnL = getTotalPnL();
  const totalValue = balance + portfolioValue;

  document.getElementById('summary-balance').textContent = formatPrice(balance);
  document.getElementById('summary-portfolio-value').textContent = formatPrice(portfolioValue);

  const pnlEl = document.getElementById('summary-pnl');
  pnlEl.textContent = (totalPnL >= 0 ? '+' : '') + formatPrice(totalPnL);
  pnlEl.style.color = totalPnL >= 0 ? 'var(--trading-up)' : 'var(--trading-down)';

  // Holdings table
  renderHoldingsTable();

  // Recent transactions
  renderTransactions();
}

function renderHoldingsTable() {
  const tbody = document.getElementById('holdings-tbody');
  const holdings = db.local.getHoldings();
  const stockIds = Object.keys(holdings);

  if (stockIds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No holdings yet. Start trading!</td></tr>';
    return;
  }

  tbody.innerHTML = stockIds.map(stockId => {
    const holding = holdings[stockId];
    const stock = getStockById(stockId);
    if (!stock) return '';

    const currentVal = holding.quantity * stock.price;
    const investedVal = holding.quantity * holding.avgPrice;
    const pnl = currentVal - investedVal;
    const isUp = pnl >= 0;

    return `
      <tr>
        <td>
          <strong style="color:var(--on-dark)">${stock.symbol}</strong>
          <div style="font-size:11px;color:var(--muted);font-family:var(--font-body)">${stock.name}</div>
        </td>
        <td>${holding.quantity}</td>
        <td>${formatPrice(holding.avgPrice)}</td>
        <td>${formatPrice(stock.price)}</td>
        <td class="${isUp ? 'trading-up' : 'trading-down'}">
          ${isUp ? '+' : ''}${formatPrice(pnl)}
        </td>
      </tr>
    `;
  }).join('');
}

function renderTransactions() {
  const container = document.getElementById('txn-list');
  const transactions = db.local.getTransactions();

  if (transactions.length === 0) {
    container.innerHTML = '<div class="empty-state">No transactions yet</div>';
    return;
  }

  // Show latest 10
  const latest = transactions.slice(0, 10);
  container.innerHTML = latest.map(txn => {
    const isBuy = txn.type === 'BUY';
    const time = new Date(txn.timestamp);
    const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    return `
      <div class="txn-item">
        <div class="txn-item-left">
          <span class="txn-type-badge ${isBuy ? 'buy' : 'sell'}">${txn.type}</span>
          <div>
            <div class="txn-stock">${txn.symbol || txn.stockId}</div>
            <div class="txn-detail">${txn.quantity} shares @ ${formatPrice(txn.price)}</div>
          </div>
        </div>
        <div class="txn-item-right">
          <div class="txn-total">${isBuy ? '-' : '+'} ${formatPrice(txn.total)}</div>
          <div class="txn-time">${dateStr} ${timeStr}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Toast Notification System ----
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---- Utility ----
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
