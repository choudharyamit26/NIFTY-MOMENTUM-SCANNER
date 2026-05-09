import https from 'https';
import fs from 'fs';

const url = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';

async function fetchTokens() {
  const allSymbols = new Set();
  
  try {
    const data = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      }, (res) => {
        if (res.statusCode !== 200) {
            reject(new Error(`Status ${res.statusCode}`));
            return;
        }
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
      }).on('error', reject);
    });
    
    const lines = data.split('\n');
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length > 0) {
            const symbol = parts[0].trim();
            if (symbol && symbol !== 'SYMBOL') {
              allSymbols.add(symbol + '.NS');
            }
        }
    }
  } catch(e) {
    console.log('failed', e);
  }

  const sortedList = Array.from(allSymbols).sort();
  const fileContent = `export const NIFTY_UNIVERSE = [\n  ${sortedList.map(s => `"${s}"`).join(', ')}\n];\n`;
  fs.writeFileSync('src/data/stocks.ts', fileContent);
  console.log('Saved', sortedList.length, 'symbols');
}

fetchTokens();
