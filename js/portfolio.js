/* ============================================================
   STRIDES - Portfolio Management
   Buy/Sell logic, balance tracking, portfolio calculations
   ============================================================ */

let currentTradeAction = 'buy'; // 'buy' or 'sell'
let selectedStockId = null;

function initPortfolio() {
  setupTradeUI();
  updateBalanceDisplay();
}

function setupTradeUI() {
  // Trade tabs
  document.querySelectorAll('.trade-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTradeAction = tab.dataset.action;
      updateTradeButton();
      updateTradeInfo();
    });
  });

  // Quantity input
  const qtyInput = document.getElementById('trade-qty');
  qtyInput.addEventListener('input', updateTradeInfo);

  // Execute trade
  document.getElementById('trade-execute').addEventListener('click', () => {
    showTradeConfirmation();
  });

  // Modal buttons
  document.getElementById('modal-cancel').addEventListener('click', closeTradeModal);
  document.getElementById('modal-confirm').addEventListener('click', executeTrade);
  document.querySelector('.modal-overlay').addEventListener('click', closeTradeModal);
}

function updateTradeButton() {
  const btn = document.getElementById('trade-execute');
  if (currentTradeAction === 'buy') {
    btn.textContent = 'Buy';
    btn.className = 'btn-trade btn-buy';
  } else {
    btn.textContent = 'Sell';
    btn.className = 'btn-trade btn-sell';
  }
}

function selectStock(stockId) {
  selectedStockId = stockId;
  const stock = getStockById(stockId);
  if (!stock) return;

  // Update detail view
  document.getElementById('no-stock-selected').classList.add('hidden');
  document.getElementById('stock-detail').classList.remove('hidden');

  document.getElementById('detail-symbol').textContent = stock.symbol;
  document.getElementById('detail-name').textContent = stock.name;
  updateStockDetail(stock);

  // Update active state in list
  document.querySelectorAll('.stock-item').forEach(item => {
    item.classList.toggle('active', item.dataset.stockId === stockId);
  });

  // Reset trade form
  document.getElementById('trade-qty').value = 1;
  updateTradeInfo();

  // Draw chart
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
  changeEl.className = `detail-change ${isUp ? 'trading-up' : 'trading-down'}`;

  document.getElementById('detail-open').textContent = formatPrice(stock.dayOpen);
  document.getElementById('detail-high').textContent = formatPrice(stock.dayHigh);
  document.getElementById('detail-low').textContent = formatPrice(stock.dayLow);
  document.getElementById('detail-close').textContent = formatPrice(stock.price);
  document.getElementById('detail-vol').textContent = formatVolume(stock.volume);

  // Update trade info
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

  if (qty <= 0) {
    showToast('Please enter a valid quantity', 'error');
    return;
  }

  const total = qty * stock.price;
  const balance = db.local.getBalance();
  const holdings = db.local.getHoldings();
  const holding = holdings[selectedStockId];

  if (currentTradeAction === 'buy') {
    if (total > balance) {
      showToast('Insufficient StrideCoins for this purchase', 'error');
      return;
    }
  } else {
    if (!holding || holding.quantity < qty) {
      showToast('Not enough shares to sell', 'error');
      return;
    }
  }

  // Show modal
  const modal = document.getElementById('trade-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = currentTradeAction === 'buy' ? 'Confirm Purchase' : 'Confirm Sale';
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--muted)">Stock</span>
        <strong>${stock.symbol}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--muted)">Action</span>
        <strong style="color:${currentTradeAction === 'buy' ? 'var(--trading-up)' : 'var(--trading-down)'}">
          ${currentTradeAction.toUpperCase()}
        </strong>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--muted)">Quantity</span>
        <strong>${qty}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--muted)">Price</span>
        <strong>${formatPrice(stock.price)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid var(--hairline);padding-top:8px;">
        <span style="color:var(--muted)">Total</span>
        <strong style="font-size:16px;">${formatPrice(total)}</strong>
      </div>
    </div>
  `;

  const confirmBtn = document.getElementById('modal-confirm');
  confirmBtn.textContent = currentTradeAction === 'buy' ? 'Buy' : 'Sell';
  confirmBtn.className = currentTradeAction === 'buy' ? 'btn-trade btn-buy' : 'btn-trade btn-sell';

  modal.classList.remove('hidden');
}

function closeTradeModal() {
  document.getElementById('trade-modal').classList.add('hidden');
}

async function executeTrade() {
  closeTradeModal();

  const stock = getStockById(selectedStockId);
  const qty = parseInt(document.getElementById('trade-qty').value) || 0;
  const total = qty * stock.price;
  const holdings = db.local.getHoldings();
  const holding = holdings[selectedStockId];

  if (currentTradeAction === 'buy') {
    // Buy logic
    let newBalance = db.local.getBalance() - total;
    if (newBalance < 0) {
      showToast('Insufficient StrideCoins', 'error');
      return;
    }

    let newQty = qty;
    let newAvgPrice = stock.price;

    if (holding) {
      const oldTotal = holding.quantity * holding.avgPrice;
      newQty = holding.quantity + qty;
      newAvgPrice = (oldTotal + total) / newQty;
    }

    holdings[selectedStockId] = { quantity: newQty, avgPrice: round2(newAvgPrice) };
    db.local.setHoldings(holdings);
    db.local.setBalance(round2(newBalance));
    await db.updateBalance(round2(newBalance));
    await db.upsertHolding(selectedStockId, newQty, round2(newAvgPrice));

  } else {
    // Sell logic
    if (!holding || holding.quantity < qty) {
      showToast('Not enough shares to sell', 'error');
      return;
    }

    let newQty = holding.quantity - qty;
    let newBalance = db.local.getBalance() + total;

    if (newQty === 0) {
      delete holdings[selectedStockId];
      db.local.setHoldings(holdings);
      await db.removeHolding(selectedStockId);
    } else {
      holdings[selectedStockId] = { quantity: newQty, avgPrice: holding.avgPrice };
      db.local.setHoldings(holdings);
      await db.upsertHolding(selectedStockId, newQty, holding.avgPrice);
    }

    db.local.setBalance(round2(newBalance));
    await db.updateBalance(round2(newBalance));
  }

  // Record transaction
  const txn = {
    stockId: selectedStockId,
    symbol: stock.symbol,
    name: stock.name,
    type: currentTradeAction.toUpperCase(),
    quantity: qty,
    price: stock.price,
    total: total,
    timestamp: new Date().toISOString()
  };
  await db.addTransaction(txn);

  // Update UI
  updateBalanceDisplay();
  updateTradeInfo();
  showToast(
    `${currentTradeAction === 'buy' ? 'Bought' : 'Sold'} ${qty} ${stock.symbol} @ ${formatPrice(stock.price)}`,
    'success'
  );

  // Flash effect on stock item
  const stockItem = document.querySelector(`.stock-item[data-stock-id="${selectedStockId}"]`);
  if (stockItem) {
    stockItem.classList.add(currentTradeAction === 'buy' ? 'flash-up' : 'flash-down');
    setTimeout(() => {
      stockItem.classList.remove('flash-up', 'flash-down');
    }, 600);
  }
}

function updateBalanceDisplay() {
  const balance = db.local.getBalance();
  document.getElementById('nav-balance').textContent = Number(balance).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function getPortfolioValue() {
  const holdings = db.local.getHoldings();
  let value = 0;
  Object.keys(holdings).forEach(stockId => {
    const stock = getStockById(stockId);
    if (stock) {
      value += holdings[stockId].quantity * stock.price;
    }
  });
  return value;
}

function getTotalPnL() {
  const holdings = db.local.getHoldings();
  let pnl = 0;
  Object.keys(holdings).forEach(stockId => {
    const holding = holdings[stockId];
    const stock = getStockById(stockId);
    if (stock) {
      pnl += (stock.price - holding.avgPrice) * holding.quantity;
    }
  });
  return pnl;
}
