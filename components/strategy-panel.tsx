'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getStrategiesForMarket } from '@/lib/strategy-engine/registry';
import { useStrategyEngine } from '@/lib/strategy-engine/use-strategy-engine';
import type { StrategyId, StrategyMarket } from '@/lib/strategy-engine/types';

interface StrategyPanelProps {
  latestPrice: number | null;
  pipSize: number;
  symbol?: string;
}

const MARKETS: { value: StrategyMarket; label: string }[] = [
  { value: 'rise-fall', label: 'Rise/Fall' },
  { value: 'even-odd', label: 'Even/Odd' },
  { value: 'over-under', label: 'Over/Under' },
];

export function StrategyPanel({ latestPrice, pipSize, symbol }: StrategyPanelProps) {
  const [isRunning, setIsRunning] = useState(true);
  const [market, setMarket] = useState<StrategyMarket>('rise-fall');
  const strategies = useMemo(() => getStrategiesForMarket(market), [market]);
  const [strategyId, setStrategyId] = useState<StrategyId>('mts');

  const selectedStrategy = strategies.find(strategy => strategy.id === strategyId) ?? strategies[0];

  const engine = useStrategyEngine({
    market,
    strategyId: selectedStrategy.id,
    latestPrice: isRunning ? latestPrice : null,
    pipSize,
    symbol,
  });

  function handleMarketChange(nextMarket: StrategyMarket) {
    const nextStrategies = getStrategiesForMarket(nextMarket);
    setMarket(nextMarket);
    setStrategyId(nextStrategies[0].id);
  }

  return (
    <div className="max-h-[26dvh] overflow-y-auto text-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-bold">{isRunning ? 'Running' : 'Stopped'}</p>
          </div>
          <Button size="sm" variant={isRunning ? 'default' : 'secondary'} onClick={() => setIsRunning(v => !v)}>
            {isRunning ? 'ON' : 'OFF'}
          </Button>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Market</label>
          <select
            value={market}
            onChange={event => handleMarketChange(event.target.value as StrategyMarket)}
            className="w-full rounded-lg border bg-background px-3 py-2 font-bold"
          >
            {MARKETS.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Strategy</label>
          <div className="grid grid-cols-1 gap-2">
            {strategies.map(strategy => (
              <button
                key={strategy.id}
                type="button"
                onClick={() => setStrategyId(strategy.id)}
                className={`rounded-lg border px-3 py-2 text-left ${
                  selectedStrategy.id === strategy.id
                    ? 'border-primary bg-primary/10'
                    : 'bg-background'
                }`}
              >
                <div className="font-bold">{strategy.name}</div>
                <div className="text-xs text-muted-foreground">{strategy.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">Signal</p>
          <p className="text-2xl font-black">
            {isRunning ? engine.result.signal : 'WAIT'}
          </p>
          <p className="mt-2 text-xs">
            {isRunning ? engine.result.reason : 'Strategy panel is OFF.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">Symbol</p>
            <p className="font-bold">{symbol ?? '-'}</p>
          </div>

          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-bold">{latestPrice ?? '-'}</p>
          </div>

          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">Candle</p>
            <p className="font-bold">{engine.currentCandle?.direction ?? '-'}</p>
          </div>

          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="font-bold">{isRunning ? engine.result.confidence : 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
