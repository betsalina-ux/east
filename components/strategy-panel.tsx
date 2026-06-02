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
  const [isOpen, setIsOpen] = useState(false);
  const [market, setMarket] = useState<StrategyMarket>('rise-fall');
  const strategies = useMemo(() => getStrategiesForMarket(market), [market]);

  const [strategyId, setStrategyId] = useState<StrategyId>('mts');

  const selectedStrategy = strategies.find(strategy => strategy.id === strategyId) ?? strategies[0];

  const engine = useStrategyEngine({
    market,
    strategyId: selectedStrategy.id,
    latestPrice,
    pipSize,
    symbol,
  });

  function handleMarketChange(nextMarket: StrategyMarket) {
    const nextStrategies = getStrategiesForMarket(nextMarket);
    setMarket(nextMarket);
    setStrategyId(nextStrategies[0].id);
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setIsOpen(true)}>
          Open Strategy Panel
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] rounded-2xl border bg-background shadow-xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <strong>Strategy Panel</strong>
        <button onClick={() => setIsOpen(false)} className="text-xl leading-none">
          ×
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label className="mb-2 block text-sm font-semibold">Market</label>
          <select
            value={market}
            onChange={event => handleMarketChange(event.target.value as StrategyMarket)}
            className="w-full rounded-lg border bg-background px-3 py-2"
          >
            {MARKETS.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Strategy</label>
          <div className="grid grid-cols-1 gap-2">
            {strategies.map(strategy => (
              <button
                key={strategy.id}
                onClick={() => setStrategyId(strategy.id)}
                className={`rounded-lg border px-3 py-2 text-left ${
                  selectedStrategy.id === strategy.id
                    ? 'border-primary bg-primary/10'
                    : 'bg-background'
                }`}
              >
                <div className="font-semibold">{strategy.name}</div>
                <div className="text-xs text-muted-foreground">{strategy.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="text-sm text-muted-foreground">Signal</div>
          <div className="text-2xl font-bold">{engine.result.signal}</div>
          <div className="mt-2 text-sm">{engine.result.reason}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border p-2">
            <div className="text-muted-foreground">Symbol</div>
            <strong>{symbol ?? '-'}</strong>
          </div>

          <div className="rounded-lg border p-2">
            <div className="text-muted-foreground">Price</div>
            <strong>{latestPrice ?? '-'}</strong>
          </div>

          <div className="rounded-lg border p-2">
            <div className="text-muted-foreground">Candle</div>
            <strong>{engine.currentCandle?.direction ?? '-'}</strong>
          </div>

          <div className="rounded-lg border p-2">
            <div className="text-muted-foreground">Confidence</div>
            <strong>{engine.result.confidence}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
