/* ============================================================
   InvestIQ - Chart Rendering Engine
   Line + Candlestick on Canvas — fixed timeframes
   ============================================================ */

let currentChartType = 'line';
let currentTimeframe = '1W';

const CC = {
  line: '#0ecb81', lineDown: '#f6465d', grid: 'rgba(43,49,57,0.5)', text: '#707a8a',
  candleUp: '#0ecb81', candleDown: '#f6465d', volume: 'rgba(112,122,138,0.2)',
};

function initCharts() {
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartType = btn.dataset.chart;
      document.getElementById('candle-help-btn').classList.toggle('hidden', currentChartType !== 'candle');
      if (selectedStockId) drawStockChart(selectedStockId);
    });
  });

  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTimeframe = btn.dataset.tf;
      if (selectedStockId) drawStockChart(selectedStockId);
    });
  });

  document.getElementById('candle-help-btn').addEventListener('click', () => {
    document.getElementById('candle-explain').classList.toggle('hidden');
  });
  document.querySelector('.candle-explain-close').addEventListener('click', () => {
    document.getElementById('candle-explain').classList.add('hidden');
  });

  const canvas = document.getElementById('stock-chart');
  canvas.addEventListener('mousemove', handleChartHover);
  canvas.addEventListener('mouseleave', handleChartLeave);
}

async function drawStockChart(stockId) {
  // Try fetching real history first
  const loader = document.getElementById('chart-loading');
  loader.classList.remove('hidden');

  await fetchRealHistory(stockId);

  const hist = getPriceHistory(stockId);
  if (!hist) { loader.classList.add('hidden'); return; }

  // Select data based on timeframe
  let data;
  if (currentTimeframe === '1D') {
    data = hist.intraday || [];
  } else {
    data = hist.daily || [];
    const days = currentTimeframe === '1W' ? 7 : currentTimeframe === '1M' ? 30 : 90;
    data = data.slice(-days);
  }

  if (data.length === 0) { loader.classList.add('hidden'); return; }

  const canvas = document.getElementById('stock-chart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width - 32;
  const height = 350;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(dpr, dpr);

  const padding = { top: 20, right: 60, bottom: 30, left: 10 };
  const cw = width - padding.left - padding.right;
  const ch = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  let minP = Infinity, maxP = -Infinity, maxVol = 0;
  data.forEach(d => { minP = Math.min(minP, d.low); maxP = Math.max(maxP, d.high); maxVol = Math.max(maxVol, d.volume || 0); });
  const range = maxP - minP;
  minP -= range * 0.05;
  maxP += range * 0.05;
  const finalRange = maxP - minP;

  drawGrid(ctx, padding, cw, ch, minP, maxP, width);

  if (currentChartType === 'line') drawLineChart(ctx, data, padding, cw, ch, minP, finalRange);
  else drawCandlestickChart(ctx, data, padding, cw, ch, minP, finalRange, maxVol);

  loader.classList.add('hidden');
}

function drawGrid(ctx, pad, cw, ch, minP, maxP, w) {
  const steps = 5;
  ctx.strokeStyle = CC.grid; ctx.lineWidth = 0.5;
  ctx.font = '11px "JetBrains Mono", monospace'; ctx.fillStyle = CC.text; ctx.textAlign = 'right';
  for (let i = 0; i <= steps; i++) {
    const y = pad.top + (ch / steps) * i;
    const price = maxP - ((maxP - minP) / steps) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
    ctx.fillText('\u20B9' + price.toFixed(0), w - 4, y + 4);
  }
}

function drawLineChart(ctx, data, pad, cw, ch, minP, range) {
  if (data.length < 2) return;
  const stepX = cw / (data.length - 1);
  const first = data[0].close, last = data[data.length - 1].close;
  const color = last >= first ? CC.line : CC.lineDown;
  const points = data.map((d, i) => ({
    x: pad.left + i * stepX,
    y: pad.top + ch - ((d.close - minP) / range) * ch
  }));

  // Fill
  ctx.beginPath();
  ctx.moveTo(points[0].x, pad.top + ch);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, pad.top + ch);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
  grad.addColorStop(0, last >= first ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const xc = (points[i].x + points[i - 1].x) / 2;
    const yc = (points[i].y + points[i - 1].y) / 2;
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();

  // End dot
  const lp = points[points.length - 1];
  ctx.beginPath(); ctx.arc(lp.x, lp.y, 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  ctx.beginPath(); ctx.arc(lp.x, lp.y, 7, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
}

function drawCandlestickChart(ctx, data, pad, cw, ch, minP, range, maxVol) {
  const candleW = Math.max(2, Math.min(20, (cw / data.length) * 0.7));
  const gap = cw / data.length;
  data.forEach((d, i) => {
    const x = pad.left + i * gap + gap / 2;
    const isUp = d.close >= d.open;
    const color = isUp ? CC.candleUp : CC.candleDown;
    const yO = pad.top + ch - ((d.open - minP) / range) * ch;
    const yC = pad.top + ch - ((d.close - minP) / range) * ch;
    const yH = pad.top + ch - ((d.high - minP) / range) * ch;
    const yL = pad.top + ch - ((d.low - minP) / range) * ch;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();
    const bodyTop = Math.min(yO, yC);
    const bodyH = Math.max(1, Math.abs(yC - yO));
    ctx.fillStyle = color; ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    if (maxVol > 0 && d.volume) {
      const vH = (d.volume / maxVol) * ch * 0.15;
      ctx.fillStyle = isUp ? 'rgba(14,203,129,0.15)' : 'rgba(246,70,93,0.15)';
      ctx.fillRect(x - candleW / 2, pad.top + ch - vH, candleW, vH);
    }
  });
}

function handleChartHover(e) {
  const canvas = document.getElementById('stock-chart');
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (!selectedStockId) return;
  const hist = getPriceHistory(selectedStockId);
  let data = currentTimeframe === '1D' ? (hist.intraday || []) : (hist.daily || []);
  if (currentTimeframe !== '1D') { const days = currentTimeframe === '1W' ? 7 : currentTimeframe === '1M' ? 30 : 90; data = data.slice(-days); }
  if (data.length === 0) return;
  const pad = { top: 20, right: 60, bottom: 30, left: 10 };
  const cw = rect.width - pad.left - pad.right;
  const stepX = cw / (data.length - 1);
  const idx = Math.round((x - pad.left) / stepX);
  if (idx >= 0 && idx < data.length) {
    const d = data[idx]; const isUp = d.close >= d.open;
    const tooltip = document.getElementById('chart-tooltip');
    tooltip.innerHTML = `<div style="color:${isUp?CC.candleUp:CC.candleDown};font-weight:600;margin-bottom:4px;">\u20B9${d.close.toFixed(2)}</div><div>O: \u20B9${d.open.toFixed(2)}</div><div>H: \u20B9${d.high.toFixed(2)}</div><div>L: \u20B9${d.low.toFixed(2)}</div><div>C: \u20B9${d.close.toFixed(2)}</div>`;
    tooltip.classList.remove('hidden');
    tooltip.style.left = Math.min(x + 10, rect.width - 150) + 'px';
    tooltip.style.top = Math.min((e.clientY - rect.top) - 10, rect.height - 100) + 'px';
  }
}

function handleChartLeave() { document.getElementById('chart-tooltip').classList.add('hidden'); }

/* ---- P&L Chart ---- */
function drawPnLChart() {
  const canvas = document.getElementById('pnl-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const txns = db.local.getTransactions();
  if (txns.length === 0) {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = (rect.width - 32) * dpr; canvas.height = 250 * dpr; ctx.scale(dpr, dpr);
    ctx.font = '14px "Inter",sans-serif'; ctx.fillStyle = '#707a8a'; ctx.textAlign = 'center';
    ctx.fillText('Start trading to see your portfolio trend', (rect.width - 32) / 2, 125);
    return;
  }
  const points = []; let bal = 100000;
  points.push({ time: 0, value: bal });
  [...txns].reverse().forEach((t, i) => { bal += t.type === 'SELL' ? t.total : -t.total; points.push({ time: i + 1, value: bal }); });
  const pv = getPortfolioValue();
  points.push({ time: points.length, value: db.local.getBalance() + pv });

  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width - 32, height = 250;
  canvas.width = width * dpr; canvas.height = height * dpr;
  canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
  ctx.scale(dpr, dpr);
  const pad = { top: 20, right: 60, bottom: 30, left: 10 };
  const cw = width - pad.left - pad.right, ch = height - pad.top - pad.bottom;
  const vals = points.map(p => p.value);
  const minV = Math.min(...vals) * 0.95, maxV = Math.max(...vals) * 1.05, rng = maxV - minV;

  ctx.strokeStyle = CC.grid; ctx.lineWidth = 0.5; ctx.font = '10px monospace'; ctx.fillStyle = CC.text; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ch / 4) * i; const v = maxV - ((maxV - minV) / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
    ctx.fillText('\u20B9' + Math.round(v).toLocaleString(), width - 4, y + 4);
  }

  const stepX = cw / (points.length - 1);
  const endV = points[points.length - 1].value;
  const color = endV >= 100000 ? CC.line : CC.lineDown;

  ctx.beginPath(); ctx.moveTo(pad.left, pad.top + ch);
  points.forEach((p, i) => ctx.lineTo(pad.left + i * stepX, pad.top + ch - ((p.value - minV) / rng) * ch));
  ctx.lineTo(pad.left + (points.length - 1) * stepX, pad.top + ch); ctx.closePath();
  const fg = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
  fg.addColorStop(0, endV >= 100000 ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)');
  fg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fg; ctx.fill();

  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  points.forEach((p, i) => { const x = pad.left + i * stepX, y = pad.top + ch - ((p.value - minV) / rng) * ch; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.stroke();

  const startY = pad.top + ch - ((100000 - minV) / rng) * ch;
  ctx.beginPath(); ctx.strokeStyle = 'rgba(252,213,53,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
  ctx.moveTo(pad.left, startY); ctx.lineTo(pad.left + cw, startY); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = '10px monospace'; ctx.fillStyle = '#FCD535'; ctx.textAlign = 'left';
  ctx.fillText('Start: \u20B9100,000', pad.left + 4, startY - 4);
}
