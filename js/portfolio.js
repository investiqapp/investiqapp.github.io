/* ============================================================
   InvestIQ - Portfolio Management
   ============================================================ */

let currentTradeAction = 'buy';
let selectedStockId = null;

function initPortfolio() {
  setupTradeUI();
  updateBalanceDisplay();
  setupBackButton();
}

function setupBackButton() {
  document.getElementById('back-to-list').addEventListener('click', () => {
    document.querySelector('.dashboard-layout').classList.remove('mobile-detail-open');
  });
}

function setupTradeUI() {
  document.querySelectorAll('.trade-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTradeAction = tab.dataset.action;
      updateTradeButton();
      updateTradeInfo();
    });
  });

  const qtyInput = document.getElementById('trade-qty');
  qtyInput.addEventListener('input', updateTradeInfo);

  document.getElementById('trade-execute').addEventListener('click', showTradeConfirmation);
  document.getElementById('modal-cancel').addEventListener('click', closeTradeModal);
  document.getElementById('modal-confirm').addEventListener('click', executeTrade);
  document.querySelector('.modal-overlay').addEventListener('click', closeTradeModal);
}

function updateTradeButton() {
  const btn = document.getElementById('trade-execute');
  btn.textContent = currentTradeAction === 'buy' ? 'Buy' : 'Sell';
  btn.className = 'btn-trade ' + (currentTradeAction === 'buy' ? 'btn-buy' : 'btn-sell');
}

function selectStock(stockId) {
  selectedStockId = stockId;
  const stock = getStockById(stockId);
  if (!stock) return;

  document.getElementById('no-stock-selected').classList.add('hidden');
  document.getElementById('stock-detail').classList.remove('hidden');

  document.getElementById('detail-symbol').textContent = stock.symbol;
  document.getElementById('detail-name').textContent = stock.name;
  updateStockDetail(stock);

  document.querySelectorAll('.stock-item').forEach(item => {
    item.classList.toggle('active', item.dataset.stockId === stockId);
  });

  document.getElementById('trade-qty').value = 1;
  updateTradeInfo();

  // Mobile: show detail view
  if (window.innerWidth <= 768) {
    document.querySelector('.dashboard-layout').classList.add('mobile-detail-open');
  }

  // Draw chart (try real API data first)
  drawStockChart(stockId);
}

function updateStockDetail(stock) {
  const change = getChangeValue(stock.id);
  const changePct = getChangePercent(stock.id);
  const isUp = change >= 0;

  document.getElementById('detail-price').textContent = formatPrice(stock.price);
  document.getElementById('detail-price').style.color = isUp ? 'var(--trading-up)' : 'var(--trading-down)';

  const changeEl = document.getElementById('detail-change');
  changeEl.textContent = formatChange(change, changePct);
  changeEl.className = 'detail-change ' + (isUp ? 'trading-up' : 'trading-down');

  document.getElementById('detail-open').textContent = formatPrice(stock.dayOpen);
  document.getElementById('detail-high').textContent = formatPrice(stock.dayHigh);
  document.getElementById('detail-low').textContent = formatPrice(stock.dayLow);
  document.getElementById('detail-close').textContent = formatPrice(stock.price);
  document.getElementById('detail-vol').textContent = formatVolume(stock.volume);
  updateTradeInfo();
}

function updateTradeInfo() {
  if (!selectedStockId) return;
  const stock = getStockById(selectedStockId);
  if (!stock) return;
  const qty = parseInt(document.getElementById('trade-qty').value) || 0;
  const total = qty * stock.price;
  const holdings = db.local.getHoldings();
  const holding = holdings[selectedStockId];
  document.getElementById('trade-price').textContent = formatPrice(stock.price);
  document.getElementById('trade-total').textContent = formatPrice(total);
  document.getElementById('trade-holdings').textContent = holding ? holding.quantity + ' shares' : '0 shares';
}

async function showTradeConfirmation() {
  if (!selectedStockId) return;
  const stock = getStockById(selectedStockId);
  const qty = parseInt(document.getElementById('trade-qty').value) || 0;
  if (qty <= 0) { showToast('Please enter a valid quantity', 'error'); return; }
  const total = qty * stock.price;
  const balance = db.local.getBalance();
  const holdings = db.local.getHoldings();
  const holding = holdings[selectedStockId];

  if (currentTradeAction === 'buy' && total > balance) { showToast('Insufficient StrideCoins', 'error'); return; }
  if (currentTradeAction === 'sell' && (!holding || holding.quantity < qty)) { showToast('Not enough shares to sell', 'error'); return; }

  const modal = document.getElementById('trade-modal');
  document.getElementById('modal-title').textContent = currentTradeAction === 'buy' ? 'Confirm Purchase' : 'Confirm Sale';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted)">Stock</span><strong>${stock.symbol}</strong></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted)">Action</span><strong style="color:${currentTradeAction==='buy'?'var(--trading-up)':'var(--trading-down)'}">${currentTradeAction.toUpperCase()}</strong></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted)">Quantity</span><strong>${qty}</strong></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted)">Price</span><strong>${formatPrice(stock.price)}</strong></div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid var(--hairline);padding-top:8px;"><span style="color:var(--muted)">Total</span><strong style="font-size:16px;">${formatPrice(total)}</strong></div>
    </div>`;
  document.getElementById('modal-confirm').textContent = currentTradeAction === 'buy' ? 'Buy' : 'Sell';
  document.getElementById('modal-confirm').className = 'btn-trade ' + (currentTradeAction === 'buy' ? 'btn-buy' : 'btn-sell');
  modal.classList.remove('hidden');
}

function closeTradeModal() { document.getElementById('trade-modal').classList.add('hidden'); }

async function executeTrade() {
  closeTradeModal();
  const stock = getStockById(selectedStockId);
  const qty = parseInt(document.getElementById('trade-qty').value) || 0;
  const total = qty * stock.price;
  const holdings = db.local.getHoldings();
  const holding = holdings[selectedStockId];

  if (currentTradeAction === 'buy') {
    let newBalance = db.local.getBalance() - total;
    if (newBalance < 0) { showToast('Insufficient StrideCoins', 'error'); return; }
    let newQty = qty, newAvgPrice = stock.price;
    if (holding) { newQty = holding.quantity + qty; newAvgPrice = round2((holding.quantity * holding.avgPrice + total) / newQty); }
    holdings[selectedStockId] = { quantity: newQty, avgPrice: newAvgPrice };
    db.local.setHoldings(holdings);
    db.local.setBalance(round2(newBalance));
    await db.updateBalance(round2(newBalance));
    await db.upsertHolding(selectedStockId, newQty, newAvgPrice);
  } else {
    if (!holding || holding.quantity < qty) { showToast('Not enough shares to sell', 'error'); return; }
    let newQty = holding.quantity - qty;
    let newBalance = db.local.getBalance() + total;
    if (newQty === 0) { delete holdings[selectedStockId]; db.local.setHoldings(holdings); await db.removeHolding(selectedStockId); }
    else { holdings[selectedStockId] = { quantity: newQty, avgPrice: holding.avgPrice }; db.local.setHoldings(holdings); await db.upsertHolding(selectedStockId, newQty, holding.avgPrice); }
    db.local.setBalance(round2(newBalance));
    await db.updateBalance(round2(newBalance));
  }

  const txn = { stockId: selectedStockId, symbol: stock.symbol, name: stock.name, type: currentTradeAction.toUpperCase(), quantity: qty, price: stock.price, total, timestamp: new Date().toISOString() };
  await db.addTransaction(txn);

  updateBalanceDisplay();
  updateTradeInfo();
  showToast(`${currentTradeAction === 'buy' ? 'Bought' : 'Sold'} ${qty} ${stock.symbol} @ ${formatPrice(stock.price)}`, 'success');

  const item = document.querySelector(`.stock-item[data-stock-id="${selectedStockId}"]`);
  if (item) { item.classList.add(currentTradeAction === 'buy' ? 'flash-up' : 'flash-down'); setTimeout(() => item.classList.remove('flash-up', 'flash-down'), 600); }
}

function updateBalanceDisplay() {
  const balance = db.local.getBalance();
  document.getElementById('nav-balance').textContent = Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getPortfolioValue() {
  const holdings = db.local.getHoldings();
  let value = 0;
  Object.keys(holdings).forEach(id => { const s = getStockById(id); if (s) value += holdings[id].quantity * s.price; });
  return value;
}

function getTotalPnL() {
  const holdings = db.local.getHoldings();
  let pnl = 0;
  Object.keys(holdings).forEach(id => { const h = holdings[id]; const s = getStockById(id); if (s) pnl += (s.price - h.avgPrice) * h.quantity; });
  return pnl;
}
