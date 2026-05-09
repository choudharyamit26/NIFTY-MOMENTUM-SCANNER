import express from "express";
import { createServer as createViteServer } from "vite";
import YahooFinance from "yahoo-finance2";
import { SMA, RSI, MACD } from "technicalindicators";
import { NIFTY_UNIVERSE } from "./src/data/stocks.js";
import { STOCK_CATEGORIES, getCategoriesForStock } from "./src/data/categories.js";
import { GoogleGenAI } from "@google/genai";

const yahooFinance = new YahooFinance();
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Broad Market Universe (Large, Mid, Small, Micro/Thematic)
const BROAD_MARKET_STOCKS = NIFTY_UNIVERSE;

const SECTORS = [
  { symbol: "^CNXIT", name: "Information Technology" },
  { symbol: "^NSEBANK", name: "Banking" },
  { symbol: "^CNXFIN", name: "Financial Services (NBFCs)" },
  { symbol: "^CNXAUTO", name: "Automobile" },
  { symbol: "^CNXFMCG", name: "FMCG" },
  { symbol: "^CNXMETAL", name: "Metals & Mining" },
  { symbol: "^CNXPHARMA", name: "Pharmaceuticals" },
  { symbol: "^CNXREALTY", name: "Real Estate" },
  { symbol: "^CNXENERGY", name: "Energy (Oil & Gas)" },
  { symbol: "^CNXPSE", name: "Public Sector (PSUs / Defence)" },
  { symbol: "^CNXINFRA", name: "Infrastructure" },
  { symbol: "^CRSLMD", name: "Midcap 50" },
];

// Helper to calculate technicals
function calculateTechnicals(historical: any[]) {
  if (historical.length < 200) return null; // Require 200 days for 52W high and SMA200

  const closes = historical.map((d) => d.close);
  const highs = historical.map((d) => d.high);
  const lows = historical.map((d) => d.low);
  const volumes = historical.map((d) => d.volume);

  const currentClose = closes[closes.length - 1];
  const currentVolume = volumes[volumes.length - 1];

  // 1. Moving Averages
  const sma20 = SMA.calculate({ period: 20, values: closes });
  const sma50 = SMA.calculate({ period: 50, values: closes });
  const sma200 = SMA.calculate({ period: 200, values: closes });
  
  const currentSma20 = sma20[sma20.length - 1];
  const currentSma50 = sma50[sma50.length - 1];
  const currentSma200 = sma200[sma200.length - 1];

  // 2. RSI
  const rsi = RSI.calculate({ period: 14, values: closes });
  const currentRsi = rsi[rsi.length - 1];

  // 3. MACD
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const currentMacd = macd[macd.length - 1];

  // 4. Breakout Detection (Resistance Zone)
  // Let's look at the highest high of the last 20 days (excluding today)
  const last20Highs = highs.slice(-21, -1);
  const resistance20 = Math.max(...last20Highs);
  
  // 10-day swing low for stoploss
  const last10Lows = lows.slice(-11, -1);
  const support10 = Math.min(...last10Lows);

  // 5. 52-Week High & Low
  const last252Highs = highs.slice(-252);
  const high52 = Math.max(...last252Highs);

  const last252Lows = lows.slice(-252);
  const low52 = Math.min(...last252Lows);
  
  // Volume breakout: current volume > 1.5x of 20-day average volume
  const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  
  return {
    currentClose,
    currentSma20,
    currentSma50,
    currentSma200,
    currentRsi,
    currentMacd,
    resistance20,
    support10,
    high52,
    low52,
    currentVolume,
    avgVol20
  };
}

app.get("/api/stocks", (req, res) => {
  res.json({ success: true, data: BROAD_MARKET_STOCKS });
});

app.get("/api/sectors", async (req, res) => {
  try {
    const results = [];
    const today = new Date();
    const period1 = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000); // ~60 days ago

    const promises = SECTORS.map(async (sector) => {
      try {
        const queryOptions = { period1, interval: "1d" as const };
        const chartData = await yahooFinance.chart(sector.symbol, queryOptions);
        
        const quotes = chartData.quotes.filter(q => q.close !== null);
        if (quotes.length < 20) return null;

        const closes = quotes.map(q => q.close);
        const currentClose = closes[closes.length - 1];
        const weekAgoClose = closes[Math.max(0, closes.length - 6)];
        const monthAgoClose = closes[Math.max(0, closes.length - 22)];

        const weeklyReturn = ((currentClose - weekAgoClose) / weekAgoClose) * 100;
        const monthlyReturn = ((currentClose - monthAgoClose) / monthAgoClose) * 100;

        // Calculate RSI
        const rsiInput = { values: closes, period: 14 };
        const rsiResult = RSI.calculate(rsiInput);
        const currentRsi = rsiResult[rsiResult.length - 1];

        // Calculate SMA 20
        const sma20Input = { values: closes, period: 20 };
        const sma20Result = SMA.calculate(sma20Input);
        const currentSma20 = sma20Result[sma20Result.length - 1];

        let trend = 'Neutral';
        let score = 0;

        if (currentClose > currentSma20) score += 1;
        if (weeklyReturn > 0) score += 1;
        if (monthlyReturn > 0) score += 1;
        if (currentRsi > 60) score += 1;
        if (currentRsi < 45) score -= 1;

        if (score >= 3) trend = 'Bullish / Trending Up';
        else if (score <= 1) trend = 'Bearish / Trending Down';

        return {
          name: sector.name,
          symbol: sector.symbol,
          weeklyReturn: weeklyReturn,
          monthlyReturn: monthlyReturn,
          rsi: currentRsi,
          trend,
          score
        };
      } catch (err: any) {
        if (err.message && (
          err.message.includes("No data found") ||
          err.message.includes("Failed Yahoo Schema validation") ||
          err.message.includes("Failed validation")
        )) {
          return null;
        }
        console.error(`Error fetching sector ${sector.symbol}:`, err.message || err);
        return null;
      }
    });

    const chunkResults = await Promise.allSettled(promises);
    for (const result of chunkResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }

    // Sort by score first, then by monthly return
    results.sort((a, b) => b.score - a.score || b.monthlyReturn - a.monthlyReturn);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Sector scan error:', error);
    res.status(500).json({ success: false, error: 'Failed to scan sectors' });
  }
});

app.get("/api/scan", async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const results = [];
    const today = new Date();
    const period1 = new Date(today.getTime() - 370 * 24 * 60 * 60 * 1000); // Need ~250 trading days for 200SMA and 52W High

    const chunkSize = 20;
    const total = BROAD_MARKET_STOCKS.length;

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = BROAD_MARKET_STOCKS.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (symbol) => {
        try {
          const queryOptions = { period1, interval: "1d" as const };
          const chartData = await yahooFinance.chart(symbol, queryOptions);
          const historical = chartData.quotes.filter(q => q.close !== null && q.volume !== null);
          
          if (!historical || historical.length === 0) return null;

          const technicals = calculateTechnicals(historical);
          if (!technicals) return null;

          const {
            currentClose,
            currentSma20,
            currentSma50,
            currentSma200,
            currentRsi,
            currentMacd,
            resistance20,
            support10,
            high52,
            low52,
            currentVolume,
            avgVol20
          } = technicals;

          const turnover = currentClose * avgVol20;
          if (turnover < 10000000) return null; // Skip highly illiquid stocks (< 1 Cr average daily volume)

          // Validation Signals
          let score = 0;
          const signals = [];

          // Signal 1: Minervini Trend Alignment
          if (currentClose > currentSma20 && currentSma20 > currentSma50 && currentSma50 > currentSma200) {
            score += 3;
            signals.push("Perfect Trend Alignment (>20, >50, >200)");
          } else if (currentClose > currentSma20 && currentSma20 > currentSma50) {
            score += 1;
            signals.push("Short-term Uptrend Alive");
          }

          // Signal 2: Bullish Momentum (RSI > 60)
          if (currentRsi > 60) {
            score += 2;
            signals.push(`Bullish RSI (${currentRsi.toFixed(2)})`);
          }

          // Signal 3: Near 52-Week High Breakout
          if (currentClose >= high52 * 0.85) { 
            score += 2;
            signals.push("Near 52W High (15%)");
          } else if (currentClose >= high52 * 0.95) {
            score += 3;
            signals.push("Near 52W High Breakout (5%)");
          }

          // Signal 4: Resistance Breakout (Close > 20-day high)
          if (currentClose > resistance20) {
            score += 3;
            signals.push(`Resistance Breakout (>${resistance20.toFixed(2)})`);
          } else if (currentClose > resistance20 * 0.98) {
             score += 1;
             signals.push(`Near Resistance (${resistance20.toFixed(2)})`);
          }

          // Signal 5: Volume Confirmation
          if (currentVolume > avgVol20 * 2) {
            score += 3;
            signals.push(`High Volume Breakout (${(currentVolume/avgVol20).toFixed(1)}x)`);
          } else if (currentVolume > avgVol20 * 1.5) {
            score += 1;
            signals.push(`Above Avg Volume (${(currentVolume/avgVol20).toFixed(1)}x)`);
          }

          // Strict Criteria: Must have Trend Alignment + High Volume + RSI > 60 + Score >= 8
          if (score >= 8 && currentRsi > 55 && currentVolume > avgVol20 * 1.2 && currentClose > currentSma50) {
             const isBreakout = currentClose > resistance20;
             const entryPrice = isBreakout ? currentClose : resistance20;
             let stopLoss = support10;
             
             // Ensure stoploss is below entry
             if (stopLoss >= entryPrice) {
                 stopLoss = entryPrice * 0.95;
             }
             
             const risk = entryPrice - stopLoss;
             const targetPrice = entryPrice + (risk * 2);

             const reasoning = {
               entry: isBreakout 
                 ? `Stock has broken out above the 20-day resistance (₹${resistance20.toFixed(2)}) with exceptionally high momentum and volume. Fast continuation expected.`
                 : `Stock is within tight consolidation forming a strong base. It is a buy when it crosses ₹${entryPrice.toFixed(2)} with volume.`,
               stopLoss: `Stoploss is placed at ₹${stopLoss.toFixed(2)}, which aligns with the recent 10-day swing low to protect capital if the breakout traps buyers.`,
               target: `Target is set at ₹${targetPrice.toFixed(2)} based on a 1:2 Risk/Reward ratio from the entry point.`
             };

             return {
               symbol,
               price: currentClose,
               entryPrice,
               stopLoss,
               targetPrice,
               reasoning,
               score,
               signals,
               rsi: currentRsi,
               volumeMultiplier: (currentVolume / avgVol20).toFixed(2)
             };
          }
          return null;

        } catch (err: any) {
          if (err.message && (
            err.message.includes("No data found") ||
            err.message.includes("Failed Yahoo Schema validation") ||
            err.message.includes("Failed validation")
          )) {
            // Suppress known intermittent Yahoo Finance API errors
            return null;
          }
          console.error(`Error fetching ${symbol}:`, err.message || err);
          return null;
        }
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.filter(Boolean));

      // Send progress update
      res.write(`data: ${JSON.stringify({ type: 'progress', current: Math.min(i + chunkSize, total), total })}\n\n`);
      
      // Add a small delay between chunks to avoid rate limiting from Yahoo Finance
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Sort by score descending, then by RSI descending
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.rsi - a.rsi;
    });

    // Return top 20
    res.write(`data: ${JSON.stringify({ type: 'complete', data: results.slice(0, 20) })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Scan error:", error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: "Failed to scan stocks" })}\n\n`);
    res.end();
  }
});

app.get("/api/multibaggers-scan", async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const results = [];
    const today = new Date();
    // Fetch last ~370 days to ensure we have a full 52-week (approx 252 trading days) history
    const period1 = new Date(today.getTime() - 370 * 24 * 60 * 60 * 1000); 

    const chunkSize = 20;
    const total = BROAD_MARKET_STOCKS.length;

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = BROAD_MARKET_STOCKS.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (symbol) => {
        try {
          const queryOptions = { period1, interval: "1d" as const };
          const chartData = await yahooFinance.chart(symbol, queryOptions);
          const historical = chartData.quotes.filter(q => q.close !== null);
          
          if (!historical || historical.length < 200) return null; // Ensure enough history for 52W

          const currentClose = historical[historical.length - 1].close;
          
          // Find the price from approx 1 year ago.
          // Because trading days aren't exactly 365, we can look at the first few items
          // or just take the maximum/minimum of the entire period. Wait, we just want to
          // check if it moved > 100% in 52 weeks. Usually this means from 1 year ago to today.
          // We can take the price from index 0.
          const yearAgoClose = historical[0].close;
          
          // 52 Week High/Low calculation for extra context
          const closes = historical.map(q => q.close);
          const high52 = Math.max(...closes);
          const low52 = Math.min(...closes);

          const percentChange = ((currentClose - yearAgoClose) / yearAgoClose) * 100;

          // Moved more than 100% in last 52 weeks
          if (percentChange >= 100) {
            let companyName = "";
            try {
              const quote = await yahooFinance.quote(symbol);
              companyName = quote?.longName || quote?.shortName || "";
            } catch(e) {
               // ignore
            }
            
            const categories = getCategoriesForStock(symbol, companyName);

            return {
              symbol,
              companyName,
              currentClose,
              yearAgoClose,
              high52,
              low52,
              percentChange,
              categories
            };
          }
          return null;

        } catch (err: any) {
          if (err.message && (
            err.message.includes("No data found") ||
            err.message.includes("Failed Yahoo Schema validation") ||
            err.message.includes("Failed validation")
          )) {
            return null;
          }
          console.error(`Error fetching ${symbol}:`, err.message || err);
          return null;
        }
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.filter(Boolean));

      res.write(`data: ${JSON.stringify({ type: 'progress', current: Math.min(i + chunkSize, total), total })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Sort by largest percent change descending
    results.sort((a, b) => b.percentChange - a.percentChange);

    res.write(`data: ${JSON.stringify({ type: 'complete', data: results })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Multibagger scan error:", error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: "Failed to scan stocks" })}\n\n`);
    res.end();
  }
});



async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
