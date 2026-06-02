import type { StrategyResult, StrategyTick } from '../types';

interface DdsOuParams {
  ticks: StrategyTick[];
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

function getTop3Digits(percents: Record<number, number>) {
  return Object.entries(percents)
    .map(([digit, pct]) => ({
      digit: Number(digit),
      pct,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
}

export function runDdsOuStrategy({
  ticks,
  cooldownRemaining,
}: DdsOuParams): StrategyResult {
  const distribution = getDigitDistribution(ticks);
  const latestDigit = distribution.recent.at(-1)?.digit ?? null;

  if (distribution.total < WINDOW) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Building DDS O/U data ${distribution.total}/${WINDOW}.`,
      cooldownRemaining,
      market: 'over-under',
      strategyId: 'dds-ou',
    };
  }

  if (cooldownRemaining > 0) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Cooldown active: ${Math.ceil(cooldownRemaining / 1000)}s remaining.`,
      cooldownRemaining,
      market: 'over-under',
      strategyId: 'dds-ou',
    };
  }

  const top3 = getTop3Digits(distribution.percents);
  const top3Digits = top3.map(item => item.digit);

  const has0 = top3Digits.includes(0);
  const has1 = top3Digits.includes(1);

  if (has0 && has1) {
    const triggerDigit = top3Digits.find(digit => digit !== 0 && digit !== 1);

    if (triggerDigit !== undefined && latestDigit === triggerDigit) {
      return {
        signal: 'UNDER_2',
        confidence: 90,
        reason: `DDS O/U UNDER 2: top 3 contains 0 and 1, live trigger digit ${triggerDigit}.`,
        cooldownRemaining,
        market: 'over-under',
        strategyId: 'dds-ou',
      };
    }

    return {
      signal: 'WAIT',
      confidence: 60,
      reason: `DDS O/U setup UNDER 2: top 3 has 0 and 1. Waiting for trigger digit ${triggerDigit ?? '-'}.`,
      cooldownRemaining,
      market: 'over-under',
      strategyId: 'dds-ou',
    };
  }

  const has8 = top3Digits.includes(8);
  const has9 = top3Digits.includes(9);

  if (has8 && has9) {
    const triggerDigit = top3Digits.find(digit => digit !== 8 && digit !== 9);

    if (triggerDigit !== undefined && latestDigit === triggerDigit) {
      return {
        signal: 'OVER_7',
        confidence: 90,
        reason: `DDS O/U OVER 7: top 3 contains 8 and 9, live trigger digit ${triggerDigit}.`,
        cooldownRemaining,
        market: 'over-under',
        strategyId: 'dds-ou',
      };
    }

    return {
      signal: 'WAIT',
      confidence: 60,
      reason: `DDS O/U setup OVER 7: top 3 has 8 and 9. Waiting for trigger digit ${triggerDigit ?? '-'}.`,
      cooldownRemaining,
      market: 'over-under',
      strategyId: 'dds-ou',
    };
  }

  return {
    signal: 'WAIT',
    confidence: 25,
    reason: `DDS O/U waiting: top 3 are ${top3Digits.join(', ')}.`,
    cooldownRemaining,
    market: 'over-under',
    strategyId: 'dds-ou',
  };
}
