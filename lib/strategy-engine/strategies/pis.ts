import type { StrategyCandle, StrategyResult, StrategyTick } from '../types';

interface PisParams {
  ticks: StrategyTick[];
  currentCandle: StrategyCandle | null;
  cooldownRemaining: number;
}

const WINDOW = 25;
const MIN_DATA = 20;
const DOMINANCE_PERCENT = 70;

function getPisStats(ticks: StrategyTick[]) {
  const recent = ticks
    .filter(tick => tick.digit !== null)
    .slice(-WINDOW);

  const total = recent.length;
  const evenCount = recent.filter(tick => Number(tick.digit) % 2 === 0).length;
  const oddCount = total - evenCount;

  const evenPct = total ? (evenCount / total) * 100 : 0;
  const oddPct = total ? (oddCount / total) * 100 : 0;

  let bias: 'EVEN' | 'ODD' | 'NONE' = 'NONE';

  if (total >= MIN_DATA && evenPct >= DOMINANCE_PERCENT) bias = 'EVEN';
  if (total >= MIN_DATA && oddPct >= DOMINANCE_PERCENT) bias = 'ODD';

  return {
    recent,
    total,
    evenCount,
    oddCount,
    evenPct,
    oddPct,
    bias,
  };
}

export function runPisStrategy({
  ticks,
  currentCandle,
  cooldownRemaining,
}: PisParams): StrategyResult {
  const stats = getPisStats(ticks);
  const latestDigit = stats.recent.at(-1)?.digit ?? null;

  if (stats.total < MIN_DATA) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Building PIS data ${stats.total}/${MIN_DATA}.`,
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'pis',
    };
  }

  if (!currentCandle) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: 'Building 1-minute candle for PIS.',
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'pis',
    };
  }

  if (cooldownRemaining > 0) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Cooldown active: ${Math.ceil(cooldownRemaining / 1000)}s remaining.`,
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'pis',
    };
  }

  if (stats.bias === 'EVEN') {
    const latestIsOdd = latestDigit !== null && Number(latestDigit) % 2 !== 0;

    if (latestIsOdd && currentCandle.direction === 'GREEN') {
      return {
        signal: 'BUY_EVEN',
        confidence: Math.round(Math.min(95, stats.evenPct + 15)),
        reason: `PIS BUY EVEN: EVEN dominance ${stats.evenPct.toFixed(1)}% + ODD pullback + GREEN candle.`,
        cooldownRemaining,
        market: 'even-odd',
        strategyId: 'pis',
      };
    }

    return {
      signal: 'WAIT',
      confidence: 55,
      reason: `PIS EVEN bias ${stats.evenPct.toFixed(1)}%. Waiting for ODD pullback + GREEN candle.`,
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'pis',
    };
  }

  if (stats.bias === 'ODD') {
    const latestIsEven = latestDigit !== null && Number(latestDigit) % 2 === 0;

    if (latestIsEven && currentCandle.direction === 'RED') {
      return {
        signal: 'BUY_ODD',
        confidence: Math.round(Math.min(95, stats.oddPct + 15)),
        reason: `PIS BUY ODD: ODD dominance ${stats.oddPct.toFixed(1)}% + EVEN pullback + RED candle.`,
        cooldownRemaining,
        market: 'even-odd',
        strategyId: 'pis',
      };
    }

    return {
      signal: 'WAIT',
      confidence: 55,
      reason: `PIS ODD bias ${stats.oddPct.toFixed(1)}%. Waiting for EVEN pullback + RED candle.`,
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'pis',
    };
  }

  return {
    signal: 'WAIT',
    confidence: 30,
    reason: `PIS waiting: EVEN ${stats.evenPct.toFixed(1)}%, ODD ${stats.oddPct.toFixed(1)}%. No 70% dominance.`,
    cooldownRemaining,
    market: 'even-odd',
    strategyId: 'pis',
  };
}
