import type { StrategyCandle, StrategyResult, StrategyTick } from '../types';

interface SniperRfParams {
  ticks: StrategyTick[];
  candles: StrategyCandle[];
  currentCandle: StrategyCandle | null;
  cooldownRemaining: number;
}

const SMI_PERIOD = 10;
const SIGNAL_PERIOD = 10;
const DOJI_LIMIT = 4;

function ema(previous: number | null, value: number, period: number) {
  const alpha = 2 / (period + 1);
  if (previous === null) return value;
  return value * alpha + previous * (1 - alpha);
}

function calculateSmi(ticks: StrategyTick[]) {
  const prices = ticks.map(tick => tick.price);

  let emaDiff1: number | null = null;
  let emaDiff2: number | null = null;
  let emaRange1: number | null = null;
  let emaRange2: number | null = null;
  let signal: number | null = null;

  let prevK: number | null = null;
  let prevD: number | null = null;
  let k: number | null = null;
  let d: number | null = null;

  for (let i = 0; i < prices.length; i += 1) {
    const window = prices.slice(Math.max(0, i - SMI_PERIOD + 1), i + 1);

    if (window.length < SMI_PERIOD) continue;

    const highest = Math.max(...window);
    const lowest = Math.min(...window);
    const close = prices[i];
    const midpoint = (highest + lowest) / 2;
    const diff = close - midpoint;
    const range = highest - lowest;

    emaDiff1 = ema(emaDiff1, diff, 3);
    emaDiff2 = ema(emaDiff2, emaDiff1, 3);

    emaRange1 = ema(emaRange1, range, 3);
    emaRange2 = ema(emaRange2, emaRange1, 3);

    prevK = k;
    prevD = d;

    const denominator = emaRange2 / 2;

    if (!denominator || Math.abs(denominator) < 1e-12) {
      k = 0;
    } else {
      k = 100 * (emaDiff2 / denominator);
    }

    k = Math.max(-100, Math.min(100, k));

    signal = ema(signal, k, SIGNAL_PERIOD);
    d = signal;
  }

  return {
    k,
    d,
    prevK,
    prevD,
  };
}

function isDoji(candle: StrategyCandle) {
  const range = Math.abs(candle.high - candle.low);
  const body = Math.abs(candle.close - candle.open);
  if (range === 0) return true;
  return body <= range * 0.18;
}

function countDoji(candles: StrategyCandle[]) {
  return candles.slice(-5).filter(isDoji).length;
}

function secondsToCandleClose(currentCandle: StrategyCandle | null) {
  if (!currentCandle) return null;
  return Math.max(0, Math.ceil((currentCandle.endTime - Date.now()) / 1000));
}

export function runSniperRfStrategy({
  ticks,
  candles,
  currentCandle,
  cooldownRemaining,
}: SniperRfParams): StrategyResult {
  if (ticks.length < 25) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Building Sniper RF data ${ticks.length}/25.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'sniper-rf',
    };
  }

  if (!currentCandle) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: 'Building 1-minute candle for Sniper RF.',
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'sniper-rf',
    };
  }

  if (cooldownRemaining > 0) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Cooldown active: ${Math.ceil(cooldownRemaining / 1000)}s remaining.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'sniper-rf',
    };
  }

  const dojiCount = countDoji(candles);
  if (dojiCount >= DOJI_LIMIT) {
    return {
      signal: 'WAIT',
      confidence: 10,
      reason: `Sniper RF blocked: doji market ${dojiCount}/${DOJI_LIMIT}.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'sniper-rf',
    };
  }

  const closeSeconds = secondsToCandleClose(currentCandle);
  if (closeSeconds !== null && closeSeconds <= 5) {
    return {
      signal: 'WAIT',
      confidence: 20,
      reason: `Sniper RF waiting: candle ending in ${closeSeconds}s.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'sniper-rf',
    };
  }

  const smi = calculateSmi(ticks);

  if (
    smi.k === null ||
    smi.d === null ||
    smi.prevK === null ||
    smi.prevD === null
  ) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: 'Building internal SMI values.',
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'sniper-rf',
    };
  }

  const crossAbove = smi.prevK <= smi.prevD && smi.k > smi.d;
  const crossBelow = smi.prevK >= smi.prevD && smi.k < smi.d;

  const callBlocked = smi.k <= -40;
  const putBlocked = smi.k >= 40;

  if (
    currentCandle.direction === 'GREEN' &&
    crossAbove &&
    !callBlocked
  ) {
    return {
      signal: 'CALL',
      confidence: 88,
      reason: `Sniper RF CALL: GREEN candle + %K crossed above %D. K ${smi.k.toFixed(2)}, D ${smi.d.toFixed(2)}.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'sniper-rf',
    };
  }

  if (
    currentCandle.direction === 'RED' &&
    crossBelow &&
    !putBlocked
  ) {
    return {
      signal: 'PUT',
      confidence: 88,
      reason: `Sniper RF PUT: RED candle + %K crossed below %D. K ${smi.k.toFixed(2)}, D ${smi.d.toFixed(2)}.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'sniper-rf',
    };
  }

  return {
    signal: 'WAIT',
    confidence: 40,
    reason: `Sniper RF waiting: candle ${currentCandle.direction}, K ${smi.k.toFixed(2)}, D ${smi.d.toFixed(2)}.`,
    cooldownRemaining,
    market: 'rise-fall',
    strategyId: 'sniper-rf',
  };
}
