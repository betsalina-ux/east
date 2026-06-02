import { runMtsStrategy } from './strategies/mts';
import { runSniperRfStrategy } from './strategies/sniper-rf';
import { runPisStrategy } from './strategies/pis';
import { runDdsStrategy } from './strategies/dds';
import { runDdsOuStrategy } from './strategies/dds-ou';
import type {
  StrategyCandle,
  StrategyId,
  StrategyMarket,
  StrategyResult,
  StrategyTick,
} from './types';

interface StrategyRunnerParams {
  market: StrategyMarket;
  strategyId: StrategyId;
  ticks: StrategyTick[];
  candles: StrategyCandle[];
  currentCandle: StrategyCandle | null;
  cooldownRemaining: number;
}

export function runStrategy({
  market,
  strategyId,
  ticks,
  candles,
  currentCandle,
  cooldownRemaining,
}: StrategyRunnerParams): StrategyResult {
  if (!ticks.length) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: 'Waiting for live ticks from MarketEye WebSocket.',
      cooldownRemaining,
      market,
      strategyId,
    };
  }

  if (!currentCandle) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: 'Building current 1-minute candle.',
      cooldownRemaining,
      market,
      strategyId,
    };
  }

  if (cooldownRemaining > 0) {
    return {
      signal: 'WAIT',
      confidence: 0,
      reason: `Cooldown active: ${Math.ceil(cooldownRemaining / 1000)}s remaining.`,
      cooldownRemaining,
      market,
      strategyId,
    };
  }

  if (strategyId === 'mts') {
  return runMtsStrategy({
    ticks,
    currentCandle,
    cooldownRemaining,
  });
}
  if (strategyId === 'sniper-rf') {
  return runSniperRfStrategy({
    ticks,
    candles,
    currentCandle,
    cooldownRemaining,
  });
}
  if (strategyId === 'pis') {
  return runPisStrategy({
    ticks,
    currentCandle,
    cooldownRemaining,
  });
}
  if (strategyId === 'dds') {
  return runDdsStrategy({
    ticks,
    currentCandle,
    cooldownRemaining,
  });
}
  if (strategyId === 'dds-ou') {
  return runDdsOuStrategy({
    ticks,
    cooldownRemaining,
  });
}

return {
  signal: 'WAIT',
  confidence: 0,
  reason: `${strategyId} selected. Strategy logic will run here next.`,
  cooldownRemaining,
  market,
  strategyId,
};
}
