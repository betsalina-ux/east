import type { StrategyMarket, StrategyOption } from './types';

export const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    id: 'mts',
    name: 'MTS',
    market: 'rise-fall',
    description: 'Momentum Trend Strategy for Rise/Fall.',
  },
  {
    id: 'sniper-rf',
    name: 'Sniper RF',
    market: 'rise-fall',
    description: 'SMI crossover and candle confirmation for Rise/Fall.',
  },
  {
    id: 'pis',
    name: 'PIS',
    market: 'even-odd',
    description: 'Parity Imbalance Strategy for Even/Odd.',
  },
  {
    id: 'dds',
    name: 'DDS',
    market: 'even-odd',
    description: 'Digit Distribution Strategy for Even/Odd.',
  },
  {
    id: 'dds-ou',
    name: 'DDS O/U',
    market: 'over-under',
    description: 'DDS Over/Under strategy.',
  },
];

export function getStrategiesForMarket(market: StrategyMarket) {
  return STRATEGY_OPTIONS.filter(strategy => strategy.market === market);
}
