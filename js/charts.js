/* ============================================================
   STRIDES - Chart Rendering Engine
   Line charts + Candlestick charts on Canvas
   ============================================================ */

let currentChartType = 'line'; // 'line' or 'candle'
let currentTimeframe = '1W';
let chartAnimationId = null;

// Color palette
const CHART_COLORS = {
  line: '#0ecb81',
  lineDown: '#f6465d',
  grid: 'rgba(43, 49, 57, 0.5)',
  text: '#707a8a',
  candleUp: '#0ecb81',
  candleDown: '#f6465d',
  wickUp: '#0ecb81',
  wickDown: '#f6465d',
  volume: 'rgba(112, 122, 138, 0.2)',
  crosshair: 'rgba(234, 236, 239, 0.2)',
  tooltip: '#eaecef',
};

function initCharts() {
  // Chart type toggle
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartType = btn.dataset.chart;

      // Show/hide candle help button
      document.getElementById('candle-help-btn').classList.toggle('hidden', currentChartType !== 'candle');

      if (selectedStockId) {
        drawStockChart(selectedStockId);
      }
    });
  });

  // Timeframe buttons
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTimeframe = btn.dataset.tf;
      if (selectedStockId) {
        drawStockChart(selectedStockId);
      }
    });
  });

  // Candle help
  document.getElementById('candle-help-btn').addEventListener('click', () => {
    document.getElementById('candle-explain').classList.toggle('hidden');
  });

  document.querySelector('.candle-explain-close').addEventListener('click', () => {
    document.getElementById('candle-explain').classList.add('hidden');
  });

  // Canvas mouse interactions
  const canvas = document.getElementById('stock-chart');
  canvas.addEventListener('mousemove', handleChartHover);
  canvas.addEventListener('mouseleave', handleChartLeave);
}

function drawStockChart(stockId) {
  const history = getPriceHistory(stockId);
  if (!history || history.length === 0) return;

  const canvas = document.getElementById('stock-chart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Get filtered data based on timeframe
  const data = filterByTimeframe(history, currentTimeframe);
  if (data.length === 0) return;

  // Set canvas size
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = (rect.width - 32) * dpr;
  canvas.height = 350 * dpr;
  canvas.style.width = (rect.width - 32) + 'px';
  canvas.style.height = '350px';
  ctx.scale(dpr, dpr);

  const width = rect.width - 32;
  const height = 350;
  const padding = { top: 20, right: 60, bottom: 40, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Calculate price range
  let minPrice = Infinity, maxPrice = -Infinity;
  let maxVol = 0;
  data.forEach(d => {
    minPrice = Math.min(minPrice, d.low);
    maxPrice = Math.max(maxPrice, d.high);
    maxVol = Math.max(maxVol, d.volume || 0);
  });

  const priceRange = maxPrice - minPrice;
  minPrice -= priceRange * 0.05;
  maxPrice += priceRange * 0.05;
  const finalRange = maxPrice - minPrice;

  // Draw grid
  drawGrid(ctx, padding, chartWidth, chartHeight, minPrice, maxPrice, width);

  if (currentChartType === 'line') {
    drawLineChart(ctx, data, padding, chartWidth, chartHeight, minPrice, finalRange);
  } else {
    drawCandlestickChart(ctx, data, padding, chartWidth, chartHeight, minPrice, finalRange, maxVol);
  }
}

function drawGrid(ctx, padding, chartWidth, chartHeight, minPrice, maxPrice, canvasWidth) {
  const steps = 5;
  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.lineWidth = 0.5;
  ctx.font = '11px "JetBrains Mono", "IBM Plex Mono", monospace';
  ctx.fillStyle = CHART_COLORS.text;
  ctx.textAlign = 'right';

  for (let i = 0; i <= steps; i++) {
    const y = padding.top + (chartHeight / steps) * i;
    const price = maxPrice - ((maxPrice - minPrice) / steps) * i;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();

    ctx.fillText('₹' + price.toFixed(0), canvasWidth - 4, y + 4);
  }
}

function drawLineChart(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange) {
  if (data.length < 2) return;

  const stepX = chartWidth / (data.length - 1);

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
  gradient.addColorStop(0, 'rgba(14, 203, 129, 0.15)');
  gradient.addColorStop(1, 'rgba(14, 203, 129, 0)');

  // Determine line color based on overall trend
  const firstPrice = data[0].close;
  const lastPrice = data[data.length - 1].close;
  const lineColor = lastPrice >= firstPrice ? CHART_COLORS.line : CHART_COLORS.lineDown;

  // Build path
  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartHeight - ((d.close - minPrice) / priceRange) * chartHeight
  }));

  // Fill area
  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + chartHeight);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
  ctx.closePath();

  const fillGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
  fillGrad.addColorStop(0, lastPrice >= firstPrice ? 'rgba(14, 203, 129, 0.12)' : 'rgba(246, 70, 93, 0.12)');
  fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Draw line
  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Smooth curve using quadratic bezier
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const xc = (points[i].x + points[i - 1].x) / 2;
    const yc = (points[i].y + points[i - 1].y) / 2;
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();

  // Current price dot
  const lastPoint = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 6, 0, Math.PI * 2);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawCandlestickChart(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, maxVol) {
  const candleWidth = Math.max(2, Math.min(20, (chartWidth / data.length) * 0.7));
  const gap = chartWidth / data.length;

  data.forEach((d, i) => {
    const x = padding.left + i * gap + gap / 2;
    const isUp = d.close >= d.open;

    const yOpen = padding.top + chartHeight - ((d.open - minPrice) / priceRange) * chartHeight;
    const yClose = padding.top + chartHeight - ((d.close - minPrice) / priceRange) * chartHeight;
    const yHigh = padding.top + chartHeight - ((d.high - minPrice) / priceRange) * chartHeight;
    const yLow = padding.top + chartHeight - ((d.low - minPrice) / priceRange) * chartHeight;

    const color = isUp ? CHART_COLORS.candleUp : CHART_COLORS.candleDown;

    // Wick (shadow)
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    // Body
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));

    ctx.fillStyle = color;
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

    // Volume bars at bottom
    if (maxVol > 0 && d.volume) {
      const volHeight = (d.volume / maxVol) * chartHeight * 0.15;
      ctx.fillStyle = isUp ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)';
      ctx.fillRect(
        x - candleWidth / 2,
        padding.top + chartHeight - volHeight,
        candleWidth,
        volHeight
      );
    }
  });
}

function filterByTimeframe(history, tf) {
  if (!history || history.length === 0) return [];

  const now = Date.now();
  let cutoff;

  switch (tf) {
    case '1D': cutoff = now - 24 * 60 * 60 * 1000; break;
    case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
    case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
    case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
    default: cutoff = 0;
  }

  const filtered = history.filter(d => d.timestamp >= cutoff);

  // If we have too few data points for longer timeframes, use all available
  if (filtered.length < 10) {
    return history.slice(-60);
  }

  return filtered;
}

// ---- Chart Hover ----
function handleChartHover(e) {
  const canvas = document.getElementById('stock-chart');
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (!selectedStockId) return;
  const history = filterByTimeframe(getPriceHistory(selectedStockId), currentTimeframe);
  if (history.length === 0) return;

  const padding = { top: 20, right: 60, bottom: 40, left: 10 };
  const chartWidth = rect.width - padding.left - padding.right;
  const stepX = chartWidth / (history.length - 1);
  const index = Math.round((x - padding.left) / stepX);

  if (index >= 0 && index < history.length) {
    const d = history[index];
    const tooltip = document.getElementById('chart-tooltip');

    const isUp = d.close >= d.open;
    tooltip.innerHTML = `
      <div style="color:${isUp ? CHART_COLORS.candleUp : CHART_COLORS.candleDown};font-weight:600;margin-bottom:4px;">
        ₹${d.close.toFixed(2)}
      </div>
      <div>O: ₹${d.open.toFixed(2)}</div>
      <div>H: ₹${d.high.toFixed(2)}</div>
      <div>L: ₹${d.low.toFixed(2)}</div>
      <div>C: ₹${d.close.toFixed(2)}</div>
    `;
    tooltip.classList.remove('hidden');

    // Position tooltip
    const tooltipX = Math.min(x + 10, rect.width - 150);
    const tooltipY = Math.min(y - 10, rect.height - 100);
    tooltip.style.left = tooltipX + 'px';
    tooltip.style.top = tooltipY + 'px';
  }
}

function handleChartLeave() {
  document.getElementById('chart-tooltip').classList.add('hidden');
}

// ---- P&L Chart for Summary ----
function drawPnLChart() {
  const canvas = document.getElementById('pnl-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Get transaction history to build P&L trend
  const transactions = db.local.getTransactions();
  if (transactions.length === 0) {
    // Draw empty state
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = (rect.width - 32) * dpr;
    canvas.height = 250 * dpr;
    ctx.scale(dpr, dpr);
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillStyle = '#707a8a';
    ctx.textAlign = 'center';
    ctx.fillText('Start trading to see your portfolio trend', (rect.width - 32) / 2, 125);
    return;
  }

  // Build P&L data points
  const points = [];
  let runningBalance = 100000;
  const sorted = [...transactions].reverse();

  points.push({ time: 0, value: runningBalance });
  sorted.forEach((txn, i) => {
    if (txn.type === 'BUY') {
      runningBalance -= txn.total;
    } else {
      runningBalance += txn.total;
    }
    points.push({ time: i + 1, value: runningBalance });
  });

  // Add current portfolio value
  const portfolioValue = getPortfolioValue();
  points.push({ time: points.length, value: db.local.getBalance() + portfolioValue });

  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width - 32;
  const height = 250;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(dpr, dpr);

  const padding = { top: 20, right: 60, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = points.map(p => p.value);
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal;

  // Grid
  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.lineWidth = 0.5;
  ctx.font = '10px monospace';
  ctx.fillStyle = CHART_COLORS.text;
  ctx.textAlign = 'right';

  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    const val = maxVal - ((maxVal - minVal) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
    ctx.fillText('₹' + Math.round(val).toLocaleString(), width - 4, y + 4);
  }

  // Line
  const stepX = chartW / (points.length - 1);
  const startVal = points[0].value;
  const endVal = points[points.length - 1].value;
  const lineColor = endVal >= startVal ? CHART_COLORS.line : CHART_COLORS.lineDown;

  // Fill
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartH);
  points.forEach((p, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - ((p.value - minVal) / range) * chartH;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(padding.left + (points.length - 1) * stepX, padding.top + chartH);
  ctx.closePath();

  const fillGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  fillGrad.addColorStop(0, endVal >= startVal ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)');
  fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  points.forEach((p, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - ((p.value - minVal) / range) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Starting balance reference line
  const startY = padding.top + chartH - ((100000 - minVal) / range) * chartH;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(252, 213, 53, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.moveTo(padding.left, startY);
  ctx.lineTo(padding.left + chartW, startY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '10px monospace';
  ctx.fillStyle = '#FCD535';
  ctx.textAlign = 'left';
  ctx.fillText('Start: ₹100,000', padding.left + 4, startY - 4);
}
