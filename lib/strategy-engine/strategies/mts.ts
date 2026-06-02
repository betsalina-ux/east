import type { StrategyCandle, StrategyResult, StrategyTick } from '../types';

interface MtsParams {
  ticks: StrategyTick[];
  currentCandle: StrategyCandle | null;
  cooldownRemaining: number;
}

const WINDOW = 25;

function getTickMovementStats(ticks: StrategyTick[]) {
  const recent = ticks.slice(-WINDOW);

  let riseCount = 0;
  let fallCount = 0;

  for (let i = 1; i < recent.length; i += 1) {
    if (recent[i].price > recent[i - 1].price) riseCount += 1;
    if (recent[i].price < recent[i - 1].price) fallCount += 1;
  }

  const total = riseCount + fallCount;

  return {
    total,
    riseCount,
    fallCount,
    risePct: total ? (riseCount / total) * 100 : 0,
    fallPct: total ? (fallCount / total) * 100 : 0,
  };
}

export function runMtsStrategy({
  ticks,
  currentCandle,
  cooldownRemaining,
}: MtsParams): StrategyResult {
  const stats = getTickMovementStats(ticks);

  if (ticks.length < WINDOW) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Building MTS data ${ticks.length}/${WINDOW}.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'mts',
    };
  }

  if (!currentCandle) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: 'Building 1-minute candle for MTS.',
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'mts',
    };
  }

  if (cooldownRemaining > 0) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Cooldown active: ${Math.ceil(cooldownRemaining / 1000)}s remaining.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'mts',
    };
  }

  const direction =
    stats.risePct > stats.fallPct ? 'RISE' :
    stats.fallPct > stats.risePct ? 'FALL' :
    'WAIT';

  if (currentCandle.direction === 'GREEN' && direction === 'RISE') {
    return {
      signal: 'CALL',
      confidence: Math.round(Math.min(95, 60 + stats.risePct / 2)),
      reason: `MTS CALL: GREEN candle + RISE dominance ${stats.risePct.toFixed(1)}%.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'mts',
    };
  }

  if (currentCandle.direction === 'RED' && direction === 'FALL') {
    return {
      signal: 'PUT',
      confidence: Math.round(Math.min(95, 60 + stats.fallPct / 2)),
      reason: `MTS PUT: RED candle + FALL dominance ${stats.fallPct.toFixed(1)}%.`,
      cooldownRemaining,
      market: 'rise-fall',
      strategyId: 'mts',
    };
  }

  return {
    signal: 'WAIT',
    confidence: 35,
    reason: `MTS waiting: candle ${currentCandle.direction}, rise ${stats.risePct.toFixed(1)}%, fall ${stats.fallPct.toFixed(1)}%.`,
    cooldownRemaining,
    market: 'rise-fall',
    strategyId: 'mts',
  };
}
