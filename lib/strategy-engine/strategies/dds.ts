import type { StrategyCandle, StrategyResult, StrategyTick } from '../types';

interface DdsParams {
  ticks: StrategyTick[];
  currentCandle: StrategyCandle | null;
  cooldownRemaining: number;
}

const WINDOW = 25;

function getDigitDistribution(ticks: StrategyTick[]) {
  const recent = ticks
    .filter(tick => tick.digit !== null)
    .slice(-WINDOW);

  const counts: Record<number, number> = {};

  for (let digit = 0; digit <= 9; digit += 1) {
    counts[digit] = 0;
  }

  recent.forEach(tick => {
    counts[Number(tick.digit)] += 1;
  });

  const total = recent.length;

  const percents: Record<number, number> = {};

  for (let digit = 0; digit <= 9; digit += 1) {
    percents[digit] = total ? (counts[digit] / total) * 100 : 0;
  }

  return {
    recent,
    counts,
    percents,
    total,
  };
}

function getTickSpeed(ticks: StrategyTick[]) {
  const recent = ticks.slice(-WINDOW);

  if (recent.length < 2) return 'BUILDING';

  const gaps: number[] = [];

  for (let i = 1; i < recent.length; i += 1) {
    gaps.push(recent[i].epoch - recent[i - 1].epoch);
  }

  const avg = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  if (avg < 1200) return 'FAST';
  if (avg < 2200) return 'MEDIUM';
  return 'SLOW';
}

function getTopDigit(percents: Record<number, number>) {
  return Object.entries(percents)
    .map(([digit, pct]) => ({
      digit: Number(digit),
      pct,
    }))
    .sort((a, b) => b.pct - a.pct)[0];
}

export function runDdsStrategy({
  ticks,
  currentCandle,
  cooldownRemaining,
}: DdsParams): StrategyResult {
  const distribution = getDigitDistribution(ticks);
  const latestDigit = distribution.recent.at(-1)?.digit ?? null;

  if (distribution.total < WINDOW) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Building DDS data ${distribution.total}/${WINDOW}.`,
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'dds',
    };
  }

  if (!currentCandle) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: 'Building 1-minute candle for DDS.',
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'dds',
    };
  }

  if (cooldownRemaining > 0) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Cooldown active: ${Math.ceil(cooldownRemaining / 1000)}s remaining.`,
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'dds',
    };
  }

  const speed = getTickSpeed(ticks);

  if (speed === 'SLOW') {
    return {
      signal: 'WAIT',
      confidence: 15,
      reason: 'DDS blocked: tick speed is SLOW.',
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'dds',
    };
  }

  const topDigit = getTopDigit(distribution.percents);

  if (!topDigit || latestDigit === null) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: 'DDS waiting for live digit data.',
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'dds',
    };
  }

  if (latestDigit === topDigit.digit && topDigit.pct >= 20) {
    if (topDigit.digit % 2 === 0) {
      return {
        signal: 'BUY_ODD',
        confidence: Math.round(Math.min(95, topDigit.pct + 65)),
        reason: `DDS BUY ODD: top digit ${topDigit.digit} is EVEN at ${topDigit.pct.toFixed(1)}%.`,
        cooldownRemaining,
        market: 'even-odd',
        strategyId: 'dds',
      };
    }

    return {
      signal: 'BUY_EVEN',
      confidence: Math.round(Math.min(95, topDigit.pct + 65)),
      reason: `DDS BUY EVEN: top digit ${topDigit.digit} is ODD at ${topDigit.pct.toFixed(1)}%.`,
      cooldownRemaining,
      market: 'even-odd',
      strategyId: 'dds',
    };
  }

  return {
    signal: 'WAIT',
    confidence: 35,
    reason: `DDS waiting: top digit ${topDigit.digit} at ${topDigit.pct.toFixed(1)}%, speed ${speed}.`,
    cooldownRemaining,
    market: 'even-odd',
    strategyId: 'dds',
  };
}
