# Strides - Stock Trading Simulator

**Student Trading & Real-time Investment Development Education Simulator**

A PWA stock trading simulator designed for teenagers to learn about stock markets without the risk of real money.

## Quick Start

### Local Development

1. Simply open `index.html` in a browser, or serve with any static file server:
   ```bash
   # Using Python
   python3 -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

2. The app runs in **offline/local mode** by default — all data is stored in your browser's localStorage.

### With Supabase (Production)

1. Create a [Supabase](https://supabase.com) project
2. Run `SCHEMA.sql` in the SQL Editor to set up tables and RLS
3. Copy `config.template.js` to `config.js`:
   ```bash
   cp config.template.js config.js
   ```
4. Edit `config.js` with your Supabase URL and anon key:
   ```javascript
   window.__STRIDES_SUPABASE_URL__ = 'https://xxxxx.supabase.co';
   window.__STRIDES_SUPABASE_ANON_KEY__ = 'eyJhbGciOiJIUzI1NiIs...';
   ```
5. Add a `<script src="config.js"></script>` tag in `index.html` BEFORE the other scripts:
   ```html
   <script src="config.js"></script>
   <script src="js/db.js"></script>
   ```

### GitHub Pages Deployment

1. Push this folder to a GitHub repository
2. Go to Settings > Pages > Source: Deploy from branch (main)
3. For Supabase credentials, use GitHub Actions secrets:
   - Create a workflow that generates `config.js` from secrets
   - Or use the manual `config.js` approach (ensure it's in `.gitignore`)

## Features

- **10 Simulated Stocks** — Recognizable but fictionalized Indian companies
- **100,000 StrideCoins** starting balance for risk-free trading
- **Real-time Price Simulation** — Random walk with mean reversion
- **Line & Candlestick Charts** — Toggleable with educational explanations
- **Portfolio Tracking** — Holdings, P&L, transaction history
- **Educational Content** — Terminology, trading patterns, chart reading guides
- **PWA Installable** — Works offline, installable on any device
- **Glassmorphic Dark Theme** — Modern, gamified aesthetic

## Simulated Companies

| Ticker   | Company Name              | Based On             |
|----------|--------------------------|---------------------|
| RELIANCE | Reliance Global           | Reliance Industries |
| INFOVISTA| InfoVista Ltd            | Infosys             |
| HORIZON  | Horizon Bank             | HDFC Bank           |
| TATADRIVE| TataDrives Motors        | Tata Motors         |
| SOVEREIGN| Sovereign Bank           | State Bank of India |
| NEXUS    | Nexus Bank               | ICICI Bank          |
| SKYLINK  | SkyLink Telecom          | Bharti Airtel       |
| CHROMA   | ChromaCoat Industries    | Asian Paints        |
| TCSDIGI  | TCS Digital              | TCS                 |
| IMPERIAL | Imperial Brands Ltd      | ITC Limited         |

## Tech Stack

- **Pure HTML/CSS/JavaScript** — No frameworks or libraries (except Supabase client CDN)
- **Canvas API** — Charts rendered on HTML5 Canvas
- **Supabase** — Auth and data persistence (optional)
- **Service Worker** — Offline caching
- **Web App Manifest** — PWA installability

## File Structure

```
strides/
├── index.html          # Single-page app shell
├── css/styles.css      # Glassmorphic dark theme
├── js/
│   ├── db.js           # Supabase client + localStorage fallback
│   ├── stocks.js       # Stock simulation engine
│   ├── auth.js         # Authentication (Supabase Auth + local)
│   ├── portfolio.js    # Buy/sell logic, balance tracking
│   ├── charts.js       # Line & candlestick chart rendering
│   ├── education.js    # Terminology, patterns, guides
│   ├── pwa.js          # Install prompt, SW registration
│   └── app.js          # Main controller, routing, UI
├── icons/
│   ├── icon-192.png    # PWA icon
│   └── icon-512.png    # PWA icon
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── SCHEMA.sql          # Supabase database schema
├── config.template.js  # Supabase credentials template
└── README.md           # This file
```

## Currency

The in-game currency is **StrideCoins (SC)**. Every user starts with **100,000 SC**. Prices are displayed in Indian Rupee format (₹) for realism.

## License

Educational use only. This is a simulator — no real money or real stocks are involved.
