import type {
  StrategyId,
  StrategyMarket,
  StrategySignal,
} from './types';

export interface EngineState {
  isRunning: boolean;

  selectedMarket: StrategyMarket;
  selectedStrategy: StrategyId;

  signal: StrategySignal;

  confidence: number;

  reason: string;

  cooldownRemaining: number;

  lastSignalAt: number;

  autoTradeEnabled: boolean;

  autoTradeStake: number;

  autoTradeDirection: string | null;
}

export const DEFAULT_ENGINE_STATE: EngineState = {
  isRunning: false,

  selectedMarket: 'rise-fall',

  selectedStrategy: 'mts',

  signal: 'WAIT',

  confidence: 0,

  reason: 'Waiting for strategy start.',

  cooldownRemaining: 0,

  lastSignalAt: 0,

  autoTradeEnabled: false,

  autoTradeStake: 0,

  autoTradeDirection: null,
};
