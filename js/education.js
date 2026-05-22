/* ============================================================
   InvestIQ - Educational Content
   ============================================================ */

const TERMINOLOGY = [
  { term: 'Open', definition: 'The price at which a stock starts trading when the market opens for the day.', expanded: 'Think of it like the starting price of an auction. When the market bell rings in the morning, the first trade that happens sets the "open" price. This gives traders an idea of how the market feels about the stock compared to yesterday\'s close.' },
  { term: 'High', definition: 'The highest price a stock reached during the trading day.', expanded: 'The daily high shows the peak of optimism — the most someone was willing to pay that day. Comparing highs over multiple days can reveal resistance levels, prices where sellers tend to step in.' },
  { term: 'Low', definition: 'The lowest price a stock dropped to during the trading day.', expanded: 'The daily low marks the deepest point of selling pressure. When lows keep getting lower over several days, it signals a downtrend. Conversely, "higher lows" can be an early sign of recovery.' },
  { term: 'Close', definition: 'The last price at which a stock traded before the market closed for the day.', expanded: 'The close is arguably the most important price of the day. It represents the final consensus of all buyers and sellers. Many trading strategies are built around the relationship between open and close prices.' },
  { term: 'Volume (Vol)', definition: 'The total number of shares traded during a given period (usually a day).', expanded: 'Volume tells you how "active" a stock is. High volume means lots of people are buying and selling — which makes the price movement more meaningful. A price jump on low volume might be a fluke, but the same jump on high volume suggests genuine market conviction.' },
  { term: 'Market Cap', definition: 'The total value of all a company\'s shares. Calculated as: Share Price x Total Shares.', expanded: 'Market cap is how we measure the size of a company. A "large-cap" stock (like Reliance) tends to be more stable, while "small-cap" stocks can be more volatile but offer bigger growth potential.' },
  { term: 'Dividend', definition: 'A portion of a company\'s profits paid to shareholders, usually quarterly.', expanded: 'Not all companies pay dividends — growth companies often reinvest profits instead. Dividends are like a reward for holding a stock. The "dividend yield" (annual dividend / stock price) helps compare how generous different stocks are.' }
];

const MARKET_TERMS = [
  { term: 'Bullish', definition: 'An optimistic outlook — expecting prices to rise. Named after a bull that thrusts its horns upward.', expanded: 'When someone says "I\'m bullish on Reliance," they believe the stock price will go up. A "bull market" is an extended period of rising prices, usually accompanied by investor confidence and strong economic indicators.' },
  { term: 'Bearish', definition: 'A pessimistic outlook — expecting prices to fall. Named after a bear that swipes its paws downward.', expanded: 'A "bearish" view means you think prices will drop. A "bear market" is typically defined as a decline of 20% or more from recent highs. Bears are important for market balance — they prevent prices from rising too far too fast.' },
  { term: 'Long Position', definition: 'Buying a stock with the expectation that its price will rise. You profit when the price goes up.', expanded: 'Going "long" is the most basic trading strategy — buy low, sell high. If you buy 10 shares at \u20B9100 and sell at \u20B9120, your long position earned you \u20B9200. Most beginners start with long positions.' },
  { term: 'Short Position', definition: 'Selling a borrowed stock, hoping to buy it back cheaper. You profit when the price falls.', expanded: 'Shorting is advanced: you borrow shares, sell them, and hope the price drops so you can buy them back cheaper. If the price rises instead, your losses are potentially unlimited. This is risky and not recommended for beginners.' },
  { term: 'Support Level', definition: 'A price level where a stock tends to stop falling because buyers step in.', expanded: 'Think of support like a floor. When a stock hits a support level, buyers see it as a "bargain" and start purchasing, which pushes the price back up. Support levels often form at round numbers or previous lows.' },
  { term: 'Resistance Level', definition: 'A price level where a stock tends to stop rising because sellers step in.', expanded: 'Resistance is like a ceiling. When a stock reaches resistance, holders who bought cheaper start selling to lock in profits, pushing the price down. Breaking through resistance is often seen as a bullish signal.' },
  { term: 'Volatility', definition: 'How much and how quickly a stock\'s price moves. High volatility = big, fast swings.', expanded: 'Volatile stocks can make you rich quickly — or poor just as fast. Beginners should generally stick with lower-volatility stocks while learning. The "beta" metric measures volatility relative to the overall market.' }
];

const TRADING_PATTERNS = [
  { name: 'Morning Star', signal: 'bullish', description: 'A three-candle bullish reversal pattern. It appears at the bottom of a downtrend and signals that buyers are gaining strength.', details: 'Day 1: A large red (bearish) candle continues the downtrend. Day 2: A small-bodied candle (can be either color) shows indecision — the bears are losing momentum. Day 3: A large green (bullish) candle confirms the reversal, with the close above the midpoint of Day 1\'s candle. This pattern works best when combined with volume analysis — increasing volume on Day 3 adds confidence.' },
  { name: 'Evening Star', signal: 'bearish', description: 'The opposite of the Morning Star — a three-candle bearish reversal pattern at the top of an uptrend.', details: 'Day 1: A large green candle continues the uptrend. Day 2: A small-bodied candle shows indecision. Day 3: A large red candle closes below the midpoint of Day 1, confirming the reversal. Watch for this pattern after a significant rally — it\'s a signal to consider selling.' },
  { name: 'Rising Three Methods', signal: 'bullish', description: 'A continuation pattern where a strong bullish candle is followed by three small bearish candles, then another bullish candle that resumes the uptrend.', details: 'The three small red candles represent a brief pause or pullback, not a reversal. They should all stay within the range of the first large green candle. The final green candle confirms the trend continues. This pattern shows that despite temporary selling, buyers remain in control.' },
  { name: 'Falling Three Methods', signal: 'bearish', description: 'The bearish counterpart — a strong bearish candle, three small bullish candles, then another bearish candle resuming the downtrend.', details: 'After a significant red candle, buyers try to push the price up (the three small green candles), but they can\'t overcome the selling pressure. The final red candle confirms the downtrend is intact. This is a signal to hold off on buying or consider selling.' },
  { name: 'Hammer', signal: 'bullish', description: 'A single-candle pattern with a small body at the top and a long lower shadow, resembling a hammer. Appears at the bottom of a downtrend.', details: 'The long lower shadow shows that sellers pushed the price down significantly during the session, but buyers fought back and pushed it close to the open. This "rejection" of lower prices suggests a potential reversal. The hammer is more reliable when it appears after a clear downtrend and is confirmed by a bullish candle the next day.' },
  { name: 'Doji', signal: 'neutral', description: 'A candle where the open and close are nearly equal, creating a cross or plus sign shape. It signals indecision in the market.', details: 'A Doji alone doesn\'t predict direction — it means the market is uncertain. But in context, it\'s powerful: after a strong uptrend, a Doji might signal exhaustion and an upcoming reversal. After a downtrend, it might suggest the selling is losing steam. Always wait for confirmation from the next candle.' }
];

const CHART_GUIDES = [
  { title: 'Reading a Line Chart', content: 'A line chart is the simplest way to visualize stock prices. It connects the closing prices of a stock over time with a continuous line. When the line goes up, the stock price is increasing; when it goes down, the price is falling. The steepness of the line tells you how fast the price is changing. Line charts are great for spotting overall trends but hide the detail of what happened within each time period.' },
  { title: 'Reading a Candlestick Chart', content: 'Candlestick charts show more detail than line charts. Each "candle" represents one time period and tells you four things: the opening price, the closing price, the highest price, and the lowest price. Green candles mean the price went up (close > open). Red candles mean it went down (close < open). The thick "body" shows the open-to-close range, and the thin "wicks" show the high and low. Candlestick patterns can help predict future price movements.' },
  { title: 'Understanding Volume', content: 'Volume bars appear at the bottom of some charts and show how many shares were traded. High volume confirms a price move — a big price jump on high volume is more trustworthy than one on low volume. Volume often spikes at market opens and closes. When volume increases during a trend, it suggests the trend is strong. Declining volume during a trend may signal it\'s running out of steam.' },
  { title: 'Timeframes Matter', content: 'Different timeframe views tell different stories. A stock might look like it\'s falling on a 1-day chart but rising on a 1-month chart. Short-term traders look at minutes or hours, while long-term investors focus on weeks, months, or years. As a beginner, start with longer timeframes to understand the big picture before zooming in. The 1-week and 1-month views are great starting points.' }
];

function initEducation() {
  renderTerminology(); renderMarketTerms(); renderPatterns(); renderChartGuides();
}

function renderTerminology() {
  document.getElementById('terminology-cards').innerHTML = TERMINOLOGY.map(i => `
    <div class="learn-card" onclick="this.classList.toggle('expanded')">
      <div class="learn-card-term">${i.term}</div>
      <div class="learn-card-def">${i.definition}</div>
      <div class="learn-card-expanded"><p>${i.expanded}</p></div>
    </div>`).join('');
}

function renderMarketTerms() {
  document.getElementById('market-terms-cards').innerHTML = MARKET_TERMS.map(i => `
    <div class="learn-card" onclick="this.classList.toggle('expanded')">
      <div class="learn-card-term">${i.term}</div>
      <div class="learn-card-def">${i.definition}</div>
      <div class="learn-card-expanded"><p>${i.expanded}</p></div>
    </div>`).join('');
}

function renderPatterns() {
  document.getElementById('patterns-cards').innerHTML = TRADING_PATTERNS.map((p, i) => `
    <div class="learn-card" onclick="this.classList.toggle('expanded')">
      <div class="pattern-card">
        <div class="pattern-visual"><canvas id="pat-canvas-${i}" width="160" height="120"></canvas></div>
        <div class="pattern-info">
          <div class="pattern-name">${p.name}</div>
          <div class="pattern-desc">${p.description}</div>
          <span class="pattern-signal ${p.signal}">${p.signal}</span>
          <div class="learn-card-expanded"><p style="margin-top:12px">${p.details}</p></div>
        </div>
      </div>
    </div>`).join('');
  setTimeout(() => TRADING_PATTERNS.forEach((p, i) => drawPatternVisual(i, p)), 100);
}

function renderChartGuides() {
  document.getElementById('charts-cards').innerHTML = CHART_GUIDES.map(g => `
    <div class="learn-card" onclick="this.classList.toggle('expanded')">
      <div class="learn-card-term">${g.title}</div>
      <div class="learn-card-def">${g.content.substring(0, 120)}...</div>
      <div class="learn-card-expanded"><p>${g.content}</p></div>
    </div>`).join('');
}

function drawPatternVisual(idx, pat) {
  const c = document.getElementById(`pat-canvas-${idx}`);
  if (!c) return;
  const ctx = c.getContext('2d'); const w = 160, h = 120;
  c.width = w; c.height = h;
  ctx.fillStyle = '#1e2329'; ctx.fillRect(0, 0, w, h);
  const n = pat.name;
  if (n === 'Morning Star') { drawC(ctx,30,20,90,100,85,40,false); drawC(ctx,65,55,80,65,58,50,true); drawC(ctx,100,25,70,30,65,20,true); }
  else if (n === 'Evening Star') { drawC(ctx,30,20,40,30,65,15,true); drawC(ctx,65,40,55,45,60,35,true); drawC(ctx,100,30,100,85,90,20,false); }
  else if (n === 'Rising Three Methods') { drawC(ctx,15,15,80,20,75,10,true); drawC(ctx,45,30,65,35,55,25,false); drawC(ctx,65,35,60,42,55,30,false); drawC(ctx,85,40,55,48,50,35,false); drawC(ctx,115,20,45,25,50,15,true); }
  else if (n === 'Falling Three Methods') { drawC(ctx,15,15,80,75,85,10,false); drawC(ctx,45,30,65,25,60,35,true); drawC(ctx,65,35,55,30,50,40,true); drawC(ctx,85,40,48,35,45,45,true); drawC(ctx,115,30,100,85,105,25,false); }
  else if (n === 'Hammer') { ctx.fillStyle='#0ecb81'; ctx.fillRect(79,30,2,70); ctx.fillRect(70,20,20,15); }
  else if (n === 'Doji') { ctx.fillStyle='#FCD535'; ctx.fillRect(79,20,2,30); ctx.fillRect(79,55,2,30); ctx.fillRect(70,48,20,4); }
}

function drawC(ctx, x, openY, closeY, highY, lowY, _, isUp) {
  ctx.fillStyle = isUp ? '#0ecb81' : '#f6465d';
  ctx.fillRect(x + 4, highY, 2, lowY - highY);
  ctx.fillRect(x - 2, Math.min(openY, closeY), 14, Math.max(2, Math.abs(closeY - openY)));
}
