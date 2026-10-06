import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Scale, Users, ShieldAlert, Activity, BarChart2, Layers, 
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Copy, 
  Check, RefreshCw, MessageSquare, TrendingUp, AlertCircle, Shield,
  Search, X, ChevronDown
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NIFTY_UNIVERSE } from '../data/stocks.js';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CouncilAgent {
  id: 'technical' | 'fundamental' | 'risk' | 'sentiment';
  name: string;
  title: string;
  stance: 'BULLISH' | 'BEARISH' | 'CAUTIOUS' | 'NEUTRAL';
  confidenceScore: number;
  thesis: string;
  keyPoints: string[];
}

export interface DebateExchange {
  speaker: string;
  target?: string | null;
  content: string;
  sentiment: 'bullish' | 'bearish' | 'cautious' | 'neutral';
}

export interface DebateRound {
  roundNumber: number;
  roundTitle: string;
  exchanges: DebateExchange[];
}

export interface CouncilVerdict {
  arbiter: string;
  decision: 'STRONG BUY' | 'BUY ON PULLBACK' | 'HOLD / WAIT' | 'AVOID / HIGH RISK TRAP';
  headline: string;
  summary: string;
  clashResolution: string;
  execution: {
    recommendedEntry: number;
    stopLoss: number;
    target1: number;
    target2: number;
    riskRewardRatio: string;
    positionSizing: string;
    invalidationRule: string;
  };
  catalysts: string[];
}

export interface DebateData {
  stock: {
    symbol: string;
    companyName?: string;
    price: number;
    entryPrice: number;
    stopLoss: number;
    targetPrice: number;
    rsi?: number;
    volumeMultiplier?: number | string;
    score?: number;
    sector?: string;
  };
  consensus: {
    bullishPct: number;
    bearishPct: number;
    convictionScore: number;
  };
  agents: CouncilAgent[];
  debateRounds: DebateRound[];
  finalVerdict: CouncilVerdict;
}

interface CouncilDebateProps {
  debateData: DebateData | null;
  debating: boolean;
  debateError: string | null;
  onRunDebate: (stock?: any, symbol?: string, risk?: string) => void;
  breakoutCandidates: any[];
  stockUniverse?: string[];
  selectedStock: any | null;
  onSelectStock: (stock: any) => void;
  customSymbol: string;
  setCustomSymbol: (symbol: string) => void;
  riskTolerance: 'Conservative' | 'Balanced' | 'Aggressive';
  setRiskTolerance: (risk: 'Conservative' | 'Balanced' | 'Aggressive') => void;
}

export function CouncilDebate({
  debateData,
  debating,
  debateError,
  onRunDebate,
  breakoutCandidates,
  stockUniverse = [],
  selectedStock,
  onSelectStock,
  customSymbol,
  setCustomSymbol,
  riskTolerance,
  setRiskTolerance
}: CouncilDebateProps) {
  const [activeRoundTab, setActiveRoundTab] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter stocks for the searchable dropdown
  const searchUniverse = useMemo(() => {
    return (stockUniverse && stockUniverse.length > 0) ? stockUniverse : NIFTY_UNIVERSE;
  }, [stockUniverse]);

  const filteredResults = useMemo(() => {
    const q = (customSymbol || '').trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
    
    // Scanned breakout matches
    const matchedBreakouts = breakoutCandidates.filter(c => {
      const sym = (c.symbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '');
      const name = (c.companyName || '').toUpperCase();
      if (!q) return true;
      return sym.includes(q) || name.includes(q);
    }).slice(0, 5);

    const breakoutSet = new Set(matchedBreakouts.map(b => b.symbol.toUpperCase()));

    // Universe matches
    const matchedUniverse = searchUniverse.filter(sym => {
      const clean = sym.toUpperCase().replace(/\.(NS|BO)$/i, '');
      if (breakoutSet.has(sym.toUpperCase())) return false; // don't duplicate
      if (!q) return ['TATASTEEL.NS', 'INFY.NS', 'TRENT.NS', 'ZOMATO.NS', 'HDFCBANK.NS', 'TATAMOTORS.NS', 'HAL.NS', 'SUZLON.NS'].includes(sym);
      return clean.includes(q);
    }).slice(0, 15);

    return {
      breakouts: matchedBreakouts,
      universe: matchedUniverse,
      allFlat: [
        ...matchedBreakouts.map(b => ({ symbol: b.symbol, isBreakout: true, stock: b })),
        ...matchedUniverse.map(s => ({ symbol: s, isBreakout: false, stock: null }))
      ]
    };
  }, [customSymbol, breakoutCandidates, searchUniverse]);

  const handleSelectStock = (symbol: string, stockObj?: any) => {
    const finalSym = symbol.endsWith('.NS') || symbol.endsWith('.BO') ? symbol : `${symbol}.NS`;
    setCustomSymbol(finalSym);
    if (stockObj) {
      onSelectStock(stockObj);
    } else {
      onSelectStock({ symbol: finalSym });
    }
    setDropdownOpen(false);
    onRunDebate(stockObj, finalSym, riskTolerance);
  };

  const handleClear = () => {
    setCustomSymbol('');
    setDropdownOpen(true);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!dropdownOpen) {
        setDropdownOpen(true);
      } else {
        setHighlightedIndex(prev => 
          prev < filteredResults.allFlat.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredResults.allFlat.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (dropdownOpen && highlightedIndex >= 0 && highlightedIndex < filteredResults.allFlat.length) {
        const item = filteredResults.allFlat[highlightedIndex];
        handleSelectStock(item.symbol, item.stock);
      } else if (customSymbol.trim()) {
        setDropdownOpen(false);
        onRunDebate(undefined, customSymbol.trim(), riskTolerance);
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const getAgentTheme = (id: string) => {
    switch (id) {
      case 'technical':
        return {
          icon: Activity,
          accentBg: 'bg-cyan-500/10',
          accentBorder: 'border-cyan-500/30',
          accentText: 'text-cyan-400',
          badgeBg: 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300',
          quoteBg: 'bg-cyan-950/20 border-cyan-500/20'
        };
      case 'fundamental':
        return {
          icon: BarChart2,
          accentBg: 'bg-amber-500/10',
          accentBorder: 'border-amber-500/30',
          accentText: 'text-amber-400',
          badgeBg: 'bg-amber-950/60 border-amber-800/60 text-amber-300',
          quoteBg: 'bg-amber-950/20 border-amber-500/20'
        };
      case 'risk':
        return {
          icon: ShieldAlert,
          accentBg: 'bg-rose-500/10',
          accentBorder: 'border-rose-500/30',
          accentText: 'text-rose-400',
          badgeBg: 'bg-rose-950/60 border-rose-800/60 text-rose-300',
          quoteBg: 'bg-rose-950/20 border-rose-500/20'
        };
      case 'sentiment':
      default:
        return {
          icon: Layers,
          accentBg: 'bg-purple-500/10',
          accentBorder: 'border-purple-500/30',
          accentText: 'text-purple-400',
          badgeBg: 'bg-purple-950/60 border-purple-800/60 text-purple-300',
          quoteBg: 'bg-purple-950/20 border-purple-500/20'
        };
    }
  };

  const getStanceBadge = (stance: string) => {
    switch (stance) {
      case 'BULLISH':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'BEARISH':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'CAUTIOUS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'STRONG BUY':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'BUY ON PULLBACK':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'HOLD / WAIT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'AVOID / HIGH RISK TRAP':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-zinc-800 text-zinc-200 border-zinc-700';
    }
  };

  const copyVerdictToClipboard = () => {
    if (!debateData) return;
    const v = debateData.finalVerdict;
    const s = debateData.stock;
    const memo = `=== DALAL STREET INVESTMENT COUNCIL DECREE ===
Stock: ${s.symbol} (${s.companyName || s.symbol})
CMP: ₹${s.price.toFixed(2)}
Verdict: ${v.decision}
Headline: ${v.headline}
Executive Summary: ${v.summary}

--- EXECUTION BLUEPRINT ---
Entry: ₹${v.execution.recommendedEntry.toFixed(2)}
Stop Loss: ₹${v.execution.stopLoss.toFixed(2)}
Target 1: ₹${v.execution.target1.toFixed(2)}
Target 2: ₹${v.execution.target2.toFixed(2)}
Risk/Reward: ${v.execution.riskRewardRatio}
Position Sizing: ${v.execution.positionSizing}
Invalidation Rule: ${v.execution.invalidationRule}

Arbiter: ${v.arbiter}
`;
    navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const popularSymbols = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Ind.' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy' },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
    { symbol: 'TRENT.NS', name: 'Trent Ltd.' },
    { symbol: 'ZOMATO.NS', name: 'Zomato Ltd.' }
  ];

  return (
    <div className="space-y-8">
      {/* Header Introduction */}
      <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/40 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
              <Scale className="w-3.5 h-3.5" />
              <span>Multi-Agent Deliberation Council</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-100">
              Cross-Disciplinary Signal Debate
            </h2>
            <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
              Before issuing an execution order, our 4 specialist AI agents (<span className="text-cyan-400 font-medium">Chartist</span>, <span className="text-amber-400 font-medium">Valuation Lead</span>, <span className="text-rose-400 font-medium">Risk Officer</span>, and <span className="text-purple-400 font-medium">Flow Analyst</span>) cross-examine the signal in structured head-to-head clash rounds before CIO Julian Ross renders the final binding verdict.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => onRunDebate()}
              disabled={debating}
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all shadow-lg",
                "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-95 shadow-emerald-500/10",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500 disabled:active:scale-100"
              )}
            >
              {debating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Council In Session...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-zinc-950" />
                  <span>Convene Council</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Input & Parameters Controls */}
        <div className="mt-8 pt-6 border-t border-zinc-800/60 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stock Selection */}
          <div className="lg:col-span-7 space-y-3">
            <label className="text-xs font-medium text-zinc-400 flex items-center justify-between">
              <span>Select Stock Signal to Debate:</span>
              <span className="text-zinc-500 font-normal">Ticker from Scanner or Custom NSE</span>
            </label>

            <div className="relative" ref={dropdownRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search or type NSE ticker (e.g. TATASTEEL, INFY, TRENT)..."
                    value={customSymbol}
                    onFocus={() => setDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomSymbol(e.target.value.toUpperCase());
                      setDropdownOpen(true);
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-zinc-950/90 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono uppercase transition-colors"
                  />
                  {customSymbol ? (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 p-1 rounded"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 rounded"
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", dropdownOpen && "rotate-180")} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onRunDebate(undefined, customSymbol.trim(), riskTolerance);
                  }}
                  disabled={debating || !customSymbol.trim()}
                  className="px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 text-sm font-medium rounded-xl transition-all disabled:opacity-40 whitespace-nowrap active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Debate Ticker</span>
                </button>
              </div>

              {/* Searchable Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-zinc-800/80">
                  {/* Active Scanned Breakouts */}
                  {filteredResults.breakouts.length > 0 && (
                    <div className="p-2">
                      <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-emerald-400 uppercase flex items-center justify-between">
                        <span>Scanned Breakout Candidates</span>
                        <span className="text-zinc-500 font-normal">Ranked by Momentum</span>
                      </div>
                      <div className="space-y-1 mt-1">
                        {filteredResults.breakouts.map((candidate) => {
                          const flatIndex = filteredResults.allFlat.findIndex(x => x.symbol === candidate.symbol);
                          const isHighlighted = highlightedIndex === flatIndex;
                          const isCurrent = customSymbol.toUpperCase().replace(/\.(NS|BO)$/i, '') === candidate.symbol.toUpperCase().replace(/\.(NS|BO)$/i, '');
                          
                          return (
                            <div
                              key={candidate.symbol}
                              onClick={() => handleSelectStock(candidate.symbol, candidate)}
                              onMouseEnter={() => setHighlightedIndex(flatIndex)}
                              className={cn(
                                "px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors text-xs font-mono",
                                isHighlighted ? "bg-emerald-500/15 text-emerald-300" :
                                isCurrent ? "bg-zinc-800 text-emerald-400 font-medium" :
                                "text-zinc-300 hover:bg-zinc-800/70"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-100">{candidate.symbol.replace('.NS', '')}</span>
                                {candidate.companyName && (
                                  <span className="text-[11px] text-zinc-500 font-sans truncate max-w-[140px]">
                                    {candidate.companyName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-400">CMP: ₹{candidate.price?.toFixed(1) || candidate.entryPrice?.toFixed(1)}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Score: {candidate.score}/10
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Monitored NSE Universe */}
                  {filteredResults.universe.length > 0 && (
                    <div className="p-2">
                      <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase flex items-center justify-between">
                        <span>Monitored NSE Universe</span>
                        <span className="text-zinc-500 font-normal">Click to Debate</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1">
                        {filteredResults.universe.map((sym) => {
                          const flatIndex = filteredResults.allFlat.findIndex(x => x.symbol === sym);
                          const isHighlighted = highlightedIndex === flatIndex;
                          const isCurrent = customSymbol.toUpperCase().replace(/\.(NS|BO)$/i, '') === sym.toUpperCase().replace(/\.(NS|BO)$/i, '');

                          return (
                            <div
                              key={sym}
                              onClick={() => handleSelectStock(sym)}
                              onMouseEnter={() => setHighlightedIndex(flatIndex)}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors flex items-center justify-between",
                                isHighlighted ? "bg-zinc-800 text-emerald-300 border border-zinc-700" :
                                isCurrent ? "bg-zinc-800 text-emerald-400 font-semibold" :
                                "text-zinc-300 hover:bg-zinc-800/60"
                              )}
                            >
                              <span>{sym.replace('.NS', '')}</span>
                              <span className="text-[10px] text-zinc-500">NSE</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No matches fallback */}
                  {filteredResults.breakouts.length === 0 && filteredResults.universe.length === 0 && (
                    <div className="p-4 text-center space-y-2">
                      <p className="text-xs text-zinc-400">
                        No presets found for "{customSymbol}".
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onRunDebate(undefined, customSymbol.trim(), riskTolerance);
                        }}
                        className="text-xs text-emerald-400 underline hover:text-emerald-300"
                      >
                        Debate "{customSymbol.toUpperCase()}" directly via Dalal Street Council &rarr;
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-zinc-500">Presets:</span>
              {(breakoutCandidates.length > 0 ? breakoutCandidates.slice(0, 4) : popularSymbols).map((item) => {
                const sym = item.symbol;
                const isSelected = selectedStock?.symbol === sym || customSymbol === sym;
                return (
                  <button
                    key={sym}
                    onClick={() => {
                      setCustomSymbol(sym);
                      onSelectStock(item);
                      onRunDebate(item, sym, riskTolerance);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg font-mono transition-all border",
                      isSelected 
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium" 
                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    {sym.replace('.NS', '')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Risk Posture Selector */}
          <div className="lg:col-span-5 space-y-3">
            <label className="text-xs font-medium text-zinc-400">
              Risk Tolerance & Sizing Mandate:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Conservative', 'Balanced', 'Aggressive'] as const).map((risk) => (
                <button
                  key={risk}
                  onClick={() => setRiskTolerance(risk)}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-xs font-medium border text-center transition-all",
                    riskTolerance === risk
                      ? "bg-zinc-800 text-emerald-400 border-emerald-500/40 shadow-sm"
                      : "bg-zinc-950/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-300 hover:border-zinc-700"
                  )}
                >
                  {risk}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500">
              {riskTolerance === 'Conservative' && 'Strict 1:2.5+ R/R minimum, tighter SL below swing low, defense-biased.'}
              {riskTolerance === 'Balanced' && 'Standard institutional breakout model with dynamic pullback buffer.'}
              {riskTolerance === 'Aggressive' && 'Maximum momentum trend-riding with wider continuation breathing room.'}
            </p>
          </div>
        </div>
      </div>

      {debateError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Debate Convening Error</p>
            <p className="text-xs text-red-400/80 mt-0.5">{debateError}</p>
          </div>
        </div>
      )}

      {/* Loading Chamber Animation */}
      {debating && (
        <div className="py-20 px-4 rounded-3xl border border-zinc-800/80 bg-zinc-900/30 text-center space-y-8">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 border-4 border-zinc-800 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            <Scale className="w-8 h-8 text-emerald-400 absolute inset-0 m-auto" />
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-zinc-200">The Council is Actively Deliberating</h3>
            <div className="space-y-2 text-xs font-mono text-zinc-400">
              <p className="animate-pulse flex items-center justify-center gap-2 text-cyan-400">
                <Activity className="w-3.5 h-3.5" /> Elena Vance calculating resistance & moving average alignment...
              </p>
              <p className="animate-pulse delay-150 flex items-center justify-center gap-2 text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5" /> Dr. Aris Thorne probing for bull traps & stop loss slippage...
              </p>
              <p className="animate-pulse delay-300 flex items-center justify-center gap-2 text-amber-400">
                <BarChart2 className="w-3.5 h-3.5" /> Marcus Sterling auditing valuation multiples & sector tailwinds...
              </p>
              <p className="animate-pulse delay-500 flex items-center justify-center gap-2 text-purple-400">
                <Layers className="w-3.5 h-3.5" /> Kavita Sen auditing delivery volume & institutional block prints...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* When Debate Data is Available */}
      {!debating && debateData && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Consensus Telemetry Banner */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold tracking-tight font-mono text-zinc-100">
                    {debateData.stock.symbol.replace('.NS', '')}
                  </h3>
                  {debateData.stock.companyName && (
                    <span className="text-sm text-zinc-400 truncate max-w-xs">
                      • {debateData.stock.companyName}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                    CMP: ₹{debateData.stock.price.toFixed(2)}
                  </span>
                  <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                    Entry: ₹{debateData.stock.entryPrice.toFixed(2)}
                  </span>
                  <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                    SL: ₹{debateData.stock.stopLoss.toFixed(2)}
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                    Target: ₹{debateData.stock.targetPrice.toFixed(2)}
                  </span>
                  {debateData.stock.rsi && (
                    <span className="text-zinc-400">RSI: {debateData.stock.rsi.toFixed(1)}</span>
                  )}
                  {debateData.stock.volumeMultiplier && (
                    <span className="text-zinc-400">Vol: {debateData.stock.volumeMultiplier}x</span>
                  )}
                </div>
              </div>

              {/* Consensus Meter */}
              <div className="w-full md:w-72 space-y-2 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/70">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-emerald-400">{debateData.consensus.bullishPct}% Bulls</span>
                  <span className="text-zinc-400 font-mono">Score {debateData.consensus.convictionScore}/100</span>
                  <span className="text-rose-400">{debateData.consensus.bearishPct}% Bears</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                    style={{ width: `${debateData.consensus.bullishPct}%` }}
                  />
                  <div 
                    className="h-full bg-rose-500 transition-all duration-500 ease-out"
                    style={{ width: `${debateData.consensus.bearishPct}%` }}
                  />
                </div>
                <div className="text-[11px] text-center text-zinc-500">
                  Council Stance Ratio
                </div>
              </div>
            </div>
          </div>

          {/* 4 Specialist Analysts Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                The 4 Specialist Analysts & Opening Theses
              </h3>
              <span className="text-xs text-zinc-500">Individual Perspectives</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {debateData.agents.map((agent) => {
                const theme = getAgentTheme(agent.id);
                const Icon = theme.icon;
                return (
                  <div
                    key={agent.id}
                    className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-xl border", theme.accentBg, theme.accentBorder)}>
                            <Icon className={cn("w-5 h-5", theme.accentText)} />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-zinc-100">{agent.name}</h4>
                            <p className="text-[11px] text-zinc-400">{agent.title}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className={cn("px-2.5 py-0.5 rounded-full border text-[11px] font-medium", getStanceBadge(agent.stance))}>
                          {agent.stance}
                        </span>
                        <span className="text-zinc-500 font-mono text-[11px]">
                          {agent.confidenceScore}% Conviction
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
                        "{agent.thesis}"
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Key Arguments:</p>
                        <ul className="space-y-1 text-xs text-zinc-400">
                          {agent.keyPoints.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 leading-snug">
                              <span className="text-zinc-600 mt-0.5">•</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* The Live Debate Chamber (Exchanges & Clashes) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-zinc-100">The Live Deliberation Chamber</h3>
              </div>

              {/* Round Selector Tabs */}
              <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                {debateData.debateRounds.map((round) => (
                  <button
                    key={round.roundNumber}
                    onClick={() => setActiveRoundTab(round.roundNumber)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      activeRoundTab === round.roundNumber
                        ? "bg-zinc-800 text-zinc-100 font-semibold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Round {round.roundNumber}: {round.roundNumber === 1 ? 'Opening Theses' : 'Direct Clashes'}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Round Exchanges */}
            {(() => {
              const currentRound = debateData.debateRounds.find(r => r.roundNumber === activeRoundTab) || debateData.debateRounds[0];
              if (!currentRound) return null;

              return (
                <div className="space-y-4">
                  <div className="text-xs text-zinc-500 italic pb-1">
                    {currentRound.roundTitle} • Arguments and direct counter-points between analysts:
                  </div>

                  <div className="space-y-4">
                    {currentRound.exchanges.map((ex, idx) => {
                      const isElena = ex.speaker.toLowerCase().includes('elena');
                      const isAris = ex.speaker.toLowerCase().includes('aris') || ex.speaker.toLowerCase().includes('thorne');
                      const isMarcus = ex.speaker.toLowerCase().includes('marcus');
                      const isKavita = ex.speaker.toLowerCase().includes('kavita');

                      let accentBorder = 'border-zinc-800';
                      let speakerColor = 'text-zinc-200';
                      let iconBg = 'bg-zinc-800 text-zinc-400';

                      if (isElena) {
                        accentBorder = 'border-cyan-500/30';
                        speakerColor = 'text-cyan-400';
                        iconBg = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
                      } else if (isAris) {
                        accentBorder = 'border-rose-500/30';
                        speakerColor = 'text-rose-400';
                        iconBg = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                      } else if (isMarcus) {
                        accentBorder = 'border-amber-500/30';
                        speakerColor = 'text-amber-400';
                        iconBg = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                      } else if (isKavita) {
                        accentBorder = 'border-purple-500/30';
                        speakerColor = 'text-purple-400';
                        iconBg = 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
                      }

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-4 rounded-xl border bg-zinc-950/60 transition-all",
                            accentBorder
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={cn("px-2 py-0.5 rounded text-xs font-semibold font-mono", iconBg)}>
                                {ex.speaker}
                              </span>
                              {ex.target && (
                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3" />
                                  <span>{ex.target}</span>
                                </span>
                              )}
                            </div>
                            <span className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded uppercase font-medium",
                              ex.sentiment === 'bullish' ? "bg-emerald-500/10 text-emerald-400" :
                              ex.sentiment === 'bearish' ? "bg-rose-500/10 text-rose-400" :
                              ex.sentiment === 'cautious' ? "bg-amber-500/10 text-amber-400" :
                              "bg-zinc-800 text-zinc-400"
                            )}>
                              {ex.sentiment}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed pl-1">
                            {ex.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Chief Investment Officer Julian Ross's Binding Verdict Decree */}
          <div className="bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950 border-2 border-emerald-500/30 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    Binding Arbiter Decree
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-zinc-100">
                  {debateData.finalVerdict.arbiter}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold border tracking-wide uppercase flex items-center gap-2 shadow-lg",
                  getDecisionBadge(debateData.finalVerdict.decision)
                )}>
                  <CheckCircle2 className="w-4 h-4" />
                  {debateData.finalVerdict.decision}
                </div>
                <button
                  onClick={copyVerdictToClipboard}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700/60"
                  title="Copy Trading Plan Memo"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Memo</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Headline and Executive Summary */}
            <div className="space-y-3">
              <h4 className="text-base font-semibold text-emerald-300">
                {debateData.finalVerdict.headline}
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
                {debateData.finalVerdict.summary}
              </p>
            </div>

            {/* Clash Resolution */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>How the Core Clash Was Resolved:</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed pl-6">
                {debateData.finalVerdict.clashResolution}
              </p>
            </div>

            {/* Actionable Execution Blueprint Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Mandatory Execution Parameters:
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                  <p className="text-[11px] text-zinc-500 mb-1">Recommended Entry</p>
                  <p className="font-mono text-sm font-semibold text-blue-400">
                    ₹{debateData.finalVerdict.execution.recommendedEntry.toFixed(2)}
                  </p>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                  <p className="text-[11px] text-zinc-500 mb-1">Hard Stop-Loss</p>
                  <p className="font-mono text-sm font-semibold text-red-400">
                    ₹{debateData.finalVerdict.execution.stopLoss.toFixed(2)}
                  </p>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                  <p className="text-[11px] text-zinc-500 mb-1">Target 1 (Base)</p>
                  <p className="font-mono text-sm font-semibold text-emerald-400">
                    ₹{debateData.finalVerdict.execution.target1.toFixed(2)}
                  </p>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                  <p className="text-[11px] text-zinc-500 mb-1">Target 2 (Runner)</p>
                  <p className="font-mono text-sm font-semibold text-teal-400">
                    ₹{debateData.finalVerdict.execution.target2.toFixed(2)}
                  </p>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                  <p className="text-[11px] text-zinc-500 mb-1">Risk / Reward</p>
                  <p className="font-mono text-sm font-semibold text-amber-400">
                    {debateData.finalVerdict.execution.riskRewardRatio}
                  </p>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                  <p className="text-[11px] text-zinc-500 mb-1">Position Sizing</p>
                  <p className="font-mono text-xs font-semibold text-purple-300 truncate">
                    {debateData.finalVerdict.execution.positionSizing}
                  </p>
                </div>
              </div>
            </div>

            {/* Invalidation Rule & Catalysts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-zinc-950/60 p-4 rounded-xl border border-red-500/20">
                <span className="font-medium text-red-400 block mb-1">⚠️ Invalidation Trigger:</span>
                <p className="text-zinc-400 leading-relaxed">
                  {debateData.finalVerdict.execution.invalidationRule}
                </p>
              </div>

              <div className="bg-zinc-950/60 p-4 rounded-xl border border-emerald-500/20">
                <span className="font-medium text-emerald-400 block mb-1">🚀 Catalysts to Monitor:</span>
                <ul className="text-zinc-400 space-y-1">
                  {debateData.finalVerdict.catalysts.map((c, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-emerald-500">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no debate has run yet */}
      {!debating && !debateData && (
        <div className="py-24 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
            <Scale className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-medium text-zinc-200">Council Chamber Ready</h3>
            <p className="text-zinc-500 text-sm">
              Select a stock from the Breakout Scanner above or type any NSE ticker symbol to convene the multi-agent analyst council.
            </p>
          </div>
          <button
            onClick={() => onRunDebate(undefined, customSymbol.trim() || breakoutCandidates[0]?.symbol || 'TATASTEEL.NS', riskTolerance)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors border border-zinc-700"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Launch Sample Debate ({customSymbol.trim().replace('.NS', '') || breakoutCandidates[0]?.symbol?.replace('.NS', '') || 'TATASTEEL'})</span>
          </button>
        </div>
      )}
    </div>
  );
}
