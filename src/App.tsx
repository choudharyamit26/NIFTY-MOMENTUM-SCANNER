import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Activity, TrendingUp, AlertCircle, RefreshCw, BarChart2, Clock, Layers, PieChart, List, Download, Rocket } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function MultibaggerCard({ stock }: { stock: any }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY");
      }
      
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Can you briefly explain why the stock ${stock.symbol} in the Indian stock market has surged (multibagger / >100% return) over the last 52 weeks? Provide a short sentiment analysis (bullish/bearish/neutral sentiment in the market currently), the main reasons for the price action in bullet points, and cite your sources. Note: Make sure to keep the response concise (1-2 paragraphs max). Use markdown formatting.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        tools: [{ googleSearch: {} }],
        config: {
           toolConfig: { includeServerSideToolInvocations: true }
        }
      });
      
      setAnalysis(response.text);
    } catch (err: any) {
      setError(err.message || "Failed to analyze");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-zinc-100">{stock.symbol.replace('.NS', '')}</h3>
          {stock.companyName && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{stock.companyName}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-zinc-600">CMP:</span>
            <span className="font-mono text-zinc-300">₹{stock.currentClose.toFixed(2)}</span>
          </div>
        </div>
        <div className="px-3 py-1 text-xs font-medium rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 whitespace-nowrap">
          +{stock.percentChange.toFixed(1)}%
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-zinc-800/50 mb-6">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Price 1 Year Ago</p>
          <p className="font-mono font-medium text-zinc-400">
            ₹{stock.yearAgoClose.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">52W High / Low</p>
          <p className="font-mono font-medium text-zinc-400">
            ₹{stock.high52.toFixed(1)} / ₹{stock.low52.toFixed(1)}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-800/50">
        {!analysis && !analyzing && !error && (
            <button onClick={handleAnalyze} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition-colors text-zinc-300">
                <Activity className="w-4 h-4 text-emerald-500" /> Analyze Sentiment
            </button>
        )}
        {analyzing && (
            <div className="flex items-center justify-center gap-2 py-2.5 text-zinc-400 text-sm">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                Analyzing markets...
            </div>
        )}
        {error && (
            <div className="text-sm text-red-400 text-center py-2.5">{error}</div>
        )}
        {analysis && (
            <div className="markdown-body bg-zinc-950 p-4 rounded-xl border border-zinc-800 h-64 overflow-y-auto text-sm">
               <Markdown>{analysis}</Markdown>
            </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'stocks' | 'sectors' | 'universe' | 'multibaggers'>('stocks');
  const [stockUniverse, setStockUniverse] = useState<string[]>([]);
  
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [scanningSectors, setScanningSectors] = useState(false);
  const [sectorResults, setSectorResults] = useState<any[]>([]);
  const [sectorError, setSectorError] = useState<string | null>(null);

  const [scanningMultibaggers, setScanningMultibaggers] = useState(false);
  const [multibaggerResults, setMultibaggerResults] = useState<any[]>([]);
  const [multibaggerError, setMultibaggerError] = useState<string | null>(null);
  const [multibaggerProgress, setMultibaggerProgress] = useState({ current: 0, total: 0 });

  const groupedMultibaggers = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    multibaggerResults.forEach(stock => {
      // Handle older results where categories may not exist yet
      const cats = stock.categories && stock.categories.length > 0 ? stock.categories : ["Others"];
      cats.forEach((cat: string) => {
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(stock);
      });
    });
    return groups;
  }, [multibaggerResults]);

  const handleScan = () => {
    setScanning(true);
    setError(null);
    setResults([]);
    setScanProgress({ current: 0, total: 0 });

    const eventSource = new EventSource('/api/scan');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setScanProgress({ current: data.current, total: data.total });
        } else if (data.type === 'complete') {
          setResults(data.data);
          setScanning(false);
          eventSource.close();
        } else if (data.type === 'error') {
          setError(data.error);
          setScanning(false);
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    eventSource.onerror = () => {
      setError('Connection lost during scan.');
      setScanning(false);
      eventSource.close();
    };
  };

  const handleScanSectors = async () => {
    setScanningSectors(true);
    setSectorError(null);
    try {
      const response = await fetch('/api/sectors');
      const data = await response.json();
      if (data.success) {
        setSectorResults(data.data);
      } else {
        setSectorError(data.error || 'Failed to scan sectors');
      }
    } catch (err) {
      setSectorError('Network error occurred while scanning sectors.');
    } finally {
      setScanningSectors(false);
    }
  };

  const handleScanMultibaggers = () => {
    setScanningMultibaggers(true);
    setMultibaggerError(null);
    setMultibaggerResults([]);
    setMultibaggerProgress({ current: 0, total: 0 });

    const eventSource = new EventSource('/api/multibaggers-scan');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setMultibaggerProgress({ current: data.current, total: data.total });
        } else if (data.type === 'complete') {
          setMultibaggerResults(data.data);
          setScanningMultibaggers(false);
          eventSource.close();
        } else if (data.type === 'error') {
          setMultibaggerError(data.error);
          setScanningMultibaggers(false);
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    eventSource.onerror = () => {
      setMultibaggerError('Connection lost during scan.');
      setScanningMultibaggers(false);
      eventSource.close();
    };
  };

  useEffect(() => {
    fetch('/api/stocks')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStockUniverse(data.data);
        }
      })
      .catch(console.error);
  }, []);

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = [
      'Rank',
      'Symbol',
      'CMP',
      'Entry Price',
      'Stop Loss',
      'Target Price',
      'Score',
      'Volume Multiplier',
      'Signals',
      'Entry Rationale',
      'Stoploss Rationale',
      'Target Rationale'
    ];

    const csvRows = [
      headers.join(','),
      ...results.map((stock, index) => {
        return [
          index + 1,
          stock.symbol.replace('.NS', ''),
          stock.price.toFixed(2),
          stock.entryPrice.toFixed(2),
          stock.stopLoss.toFixed(2),
          stock.targetPrice.toFixed(2),
          stock.score,
          stock.volumeMultiplier,
          `"${stock.signals.join('; ')}"`,
          `"${stock.reasoning.entry.replace(/"/g, '""')}"`,
          `"${stock.reasoning.stopLoss.replace(/"/g, '""')}"`,
          `"${stock.reasoning.target.replace(/"/g, '""')}"`
        ].join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `breakout_candidates_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Activity className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Market Momentum Scanner</h1>
            </div>
            <p className="text-zinc-400 max-w-xl">
              {activeTab === 'stocks' 
                ? 'Scans Broad Market (Large, Mid, Small, Micro Caps) for bullish momentum and resistance breakouts.'
                : activeTab === 'sectors'
                ? 'Analyzes major market sectors to identify current trending and lagging segments.'
                : activeTab === 'multibaggers'
                ? 'Scans for stocks that have moved more than 100% in the last 52 weeks.'
                : 'View the complete list of stocks currently being monitored and scanned by the system.'}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-300">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span>Analysis Timeframe: Daily (1D) interval</span>
            </div>
          </div>
          
          <button
            onClick={activeTab === 'stocks' ? handleScan : activeTab === 'sectors' ? handleScanSectors : handleScanMultibaggers}
            disabled={activeTab === 'stocks' ? scanning : activeTab === 'sectors' ? scanningSectors : scanningMultibaggers}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
              "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500 disabled:active:scale-100",
              activeTab === 'universe' ? "hidden" : "flex"
            )}
          >
            {(activeTab === 'stocks' ? scanning : activeTab === 'sectors' ? scanningSectors : scanningMultibaggers) ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Run Scan
              </>
            )}
          </button>
        </header>

        <div className="flex items-center gap-2 mb-8 border-b border-zinc-800 pb-px">
          <button
            onClick={() => setActiveTab('stocks')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'stocks' 
                ? "border-emerald-500 text-emerald-400" 
                : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
            )}
          >
            <BarChart2 className="w-4 h-4" />
            Stock Scanner
          </button>
          <button
            onClick={() => setActiveTab('sectors')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'sectors' 
                ? "border-emerald-500 text-emerald-400" 
                : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
            )}
          >
            <PieChart className="w-4 h-4" />
            Trending Sectors
          </button>
          <button
            onClick={() => setActiveTab('multibaggers')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === 'multibaggers' 
                ? "border-emerald-500 text-emerald-400" 
                : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
            )}
          >
            <Rocket className="w-4 h-4" />
            52W Flyers
          </button>
          <button
            onClick={() => setActiveTab('universe')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === 'universe' 
                ? "border-emerald-500 text-emerald-400" 
                : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
            )}
          >
            <List className="w-4 h-4" />
            Stock Universe
          </button>
        </div>

        {activeTab === 'stocks' && (
          <>
            {error && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {scanning && (
              <div className="py-24 flex flex-col items-center justify-center text-zinc-500 space-y-6 w-full max-w-md mx-auto">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-zinc-800 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <div className="w-full space-y-2 text-center">
                  <p className="animate-pulse font-medium text-zinc-300">
                    Scanning {scanProgress.current} of {scanProgress.total || '...'} stocks
                  </p>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                      style={{ width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">This may take a minute to avoid rate limits.</p>
                </div>
              </div>
            )}

            {!scanning && results.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-medium flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-emerald-400" />
                      Top 20 Breakout Candidates
                    </h2>
                    <span className="text-sm text-zinc-500">Sorted by volume multiplier</span>
                  </div>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {results.map((stock, index) => (
                    <div 
                      key={stock.symbol}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors group"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 font-mono text-sm group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors shrink-0">
                            #{index + 1}
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-xl font-semibold tracking-tight text-zinc-100">{stock.symbol.replace('.NS', '')}</h3>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-400">
                                <span className="font-mono text-zinc-300 font-medium bg-zinc-800 px-2 py-0.5 rounded">CMP: ₹{stock.price.toFixed(2)}</span>
                                <span className="font-mono text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded">Entry: ₹{stock.entryPrice.toFixed(2)}</span>
                                <span className="font-mono text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded">SL: ₹{stock.stopLoss.toFixed(2)}</span>
                                <span className="font-mono text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">Target: ₹{stock.targetPrice.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div className="grid gap-2 text-sm text-zinc-400 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                              <p><strong className="text-blue-400 font-medium">Entry Rationale:</strong> {stock.reasoning.entry}</p>
                              <p><strong className="text-red-400 font-medium">Stoploss Rationale:</strong> {stock.reasoning.stopLoss}</p>
                              <p><strong className="text-emerald-400 font-medium">Target Rationale:</strong> {stock.reasoning.target}</p>
                            </div>
                          </div>
                        </div>
                        
                          <div className="flex flex-col items-end gap-3 shrink-0">
                            <div className="flex items-center gap-3 text-sm text-zinc-400">
                              <span>Vol: {(stock.volume / 1000000).toFixed(2)}M ({stock.volumeMultiplier}x)</span>
                              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                              <span>Score: {stock.score}/10</span>
                            </div>
                          <div className="flex flex-wrap gap-2 max-w-[240px] justify-end">
                            {stock.signals.map((signal: string, i: number) => (
                              <span 
                                key={i}
                                className="px-2 py-1 text-xs font-medium bg-zinc-800/80 text-zinc-300 rounded-md border border-zinc-700/50"
                              >
                                {signal}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!scanning && results.length === 0 && !error && (
              <div className="py-24 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">Ready to Scan Stocks</h3>
                <p className="text-zinc-500 max-w-sm mx-auto">
                  Click the button above to analyze the broad market for bullish momentum and resistance breakouts.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'sectors' && (
          <>
            {sectorError && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{sectorError}</p>
              </div>
            )}

            {scanningSectors && (
              <div className="py-24 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-zinc-800 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="animate-pulse">Analyzing sector indices...</p>
              </div>
            )}

            {!scanningSectors && sectorResults.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-xl font-medium flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    Sector Performance
                  </h2>
                  <span className="text-sm text-zinc-500">Sorted by trend strength</span>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {sectorResults.map((sector, index) => (
                    <div 
                      key={sector.symbol}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight text-zinc-100">{sector.name}</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-zinc-500 font-mono">{sector.symbol}</p>
                            <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                            <span className="text-sm font-mono text-zinc-300 font-medium">₹{sector.price?.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className={cn(
                          "px-3 py-1 text-xs font-medium rounded-full border",
                          sector.trend.includes('Bullish') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          sector.trend.includes('Bearish') ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-zinc-800 text-zinc-300 border-zinc-700"
                        )}>
                          {sector.trend}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-zinc-800/50">
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">1D Return</p>
                          <p className={cn("font-mono font-medium", sector.dailyReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
                            {sector.dailyReturn >= 0 ? '+' : ''}{sector.dailyReturn.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">1W Return</p>
                          <p className={cn("font-mono font-medium", sector.weeklyReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
                            {sector.weeklyReturn >= 0 ? '+' : ''}{sector.weeklyReturn.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">1M Return</p>
                          <p className={cn("font-mono font-medium", sector.monthlyReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
                            {sector.monthlyReturn >= 0 ? '+' : ''}{sector.monthlyReturn.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">RSI (14)</p>
                          <p className="font-mono text-zinc-300">
                            {typeof sector.rsi === 'number' ? sector.rsi.toFixed(2) : sector.rsi}
                          </p>
                        </div>
                      </div>
                      
                      {(sector.topMoversDaily?.length > 0 || sector.topMoversWeekly?.length > 0) && (
                        <div className="mt-6 pt-4 border-t border-zinc-800/50 grid grid-cols-2 gap-4">
                          {sector.topMoversDaily?.length > 0 && (
                            <div>
                              <p className="text-xs text-zinc-500 mb-2 font-medium">Top 3 Movers (1D)</p>
                              <div className="space-y-1">
                                {sector.topMoversDaily.map((mover: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-300 font-mono text-xs">{mover.symbol.replace('.NS', '')} <span className="text-zinc-500 ml-1">₹{mover.price?.toFixed(2)}</span></span>
                                    <span className={cn("font-mono text-xs", mover.dailyReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
                                      {mover.dailyReturn >= 0 ? '+' : ''}{mover.dailyReturn.toFixed(2)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {sector.topMoversWeekly?.length > 0 && (
                            <div>
                              <p className="text-xs text-zinc-500 mb-2 font-medium">Top 3 Movers (1W)</p>
                              <div className="space-y-1">
                                {sector.topMoversWeekly.map((mover: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-300 font-mono text-xs">{mover.symbol.replace('.NS', '')} <span className="text-zinc-500 ml-1">₹{mover.price?.toFixed(2)}</span></span>
                                    <span className={cn("font-mono text-xs", mover.weeklyReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
                                      {mover.weeklyReturn >= 0 ? '+' : ''}{mover.weeklyReturn.toFixed(2)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!scanningSectors && sectorResults.length === 0 && !sectorError && (
              <div className="py-24 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                <Layers className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">Ready to Scan Sectors</h3>
                <p className="text-zinc-500 max-w-sm mx-auto">
                  Click the button above to analyze major market segments and identify where the money is flowing.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'multibaggers' && (
          <>
            {multibaggerError && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{multibaggerError}</p>
              </div>
            )}

            {scanningMultibaggers && (
              <div className="py-24 flex flex-col items-center justify-center text-zinc-500 space-y-6 w-full max-w-md mx-auto">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-zinc-800 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <div className="w-full space-y-2 text-center">
                  <p className="animate-pulse font-medium text-zinc-300">
                    Scanning {multibaggerProgress.current} of {multibaggerProgress.total || '...'} stocks for 100%+ gains
                  </p>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                      style={{ width: `${multibaggerProgress.total > 0 ? (multibaggerProgress.current / multibaggerProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">Scanning 52-week data...</p>
                </div>
              </div>
            )}

            {!scanningMultibaggers && multibaggerResults.length > 0 && (
              <div className="space-y-12">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-xl font-medium flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-emerald-400" />
                    52-Week Flyers (100%+ Returns)
                  </h2>
                  <span className="text-sm text-zinc-500">{multibaggerResults.length} Stocks Found</span>
                </div>
                
                {Object.entries(groupedMultibaggers).sort(([a], [b]) => {
                  if (a === "Others") return 1;
                  if (b === "Others") return -1;
                  return a.localeCompare(b);
                }).map(([category, stocks]) => (
                  <div key={category} className="space-y-4">
                    <h3 className="text-lg font-medium text-emerald-300 border-b border-zinc-800/50 pb-2 inline-block">
                      {category} <span className="text-zinc-500 text-sm ml-2">({stocks.length})</span>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {stocks.map((stock) => (
                         <MultibaggerCard key={stock.symbol} stock={stock} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!scanningMultibaggers && multibaggerResults.length === 0 && !multibaggerError && (
              <div className="py-24 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                <Rocket className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">Ready to Find Multibaggers</h3>
                <p className="text-zinc-500 max-w-sm mx-auto">
                  Click the button above to scan the entire universe for stocks that have doubled (100%+ returns) in the last 52 weeks.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'universe' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-xl font-medium flex items-center gap-2">
                <List className="w-5 h-5 text-emerald-400" />
                Scanned Stock Universe
              </h2>
              <span className="text-sm text-zinc-500">{stockUniverse.length} Stocks Total</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {stockUniverse.map((symbol) => (
                <div 
                  key={symbol} 
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-center hover:border-emerald-500/30 transition-colors"
                >
                  <span className="font-mono text-zinc-300 font-medium tracking-wide">
                    {symbol.replace('.NS', '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
