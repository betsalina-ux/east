export type StrategyMarket = 'rise-fall' | 'even-odd' | 'over-under';

export type StrategySignal =
  | 'CALL'
  | 'PUT'
  | 'BUY_EVEN'
  | 'BUY_ODD'
  | 'UNDER_2'
  | 'OVER_7'
  | 'WAIT';

export type StrategyId =
  | 'mts'
  | 'sniper-rf'
  | 'pis'
  | 'dds'
  | 'dds-ou';

export interface StrategyOption {
  id: StrategyId;
  name: string;
  market: StrategyMarket;
  description: string;
}

export interface StrategyTick {
  price: number;
  digit: number | null;
  epoch: number;
}

export interface StrategyCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  direction: 'GREEN' | 'RED' | 'DOJI';
  startTime: number;
  endTime: number;
}

export interface StrategyResult {
  signal: StrategySignal;
  confidence: number;
  reason: string;
  cooldownRemaining: number;
  market: StrategyMarket;
  strategyId: StrategyId;
}
