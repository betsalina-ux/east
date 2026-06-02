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

  return {
    signal: 'WAIT',
    confidence: 0,
    reason: `${strategyId} selected. Strategy logic will run here next.`,
    cooldownRemaining,
    market,
    strategyId,
  };
}
