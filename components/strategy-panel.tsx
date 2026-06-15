'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getStrategiesForMarket } from '@/lib/strategy-engine/registry';
import { useStrategyEngine } from '@/lib/strategy-engine/use-strategy-engine';
import type { StrategyId, StrategyMarket } from '@/lib/strategy-engine/types';

interface StrategyPanelProps {
  latestPrice: number | null;
  pipSize: number;
  symbol?: string;
  variant?: 'default' | 'dbot';
  forcedMarket?: StrategyMarket;
}

const DEFAULT_MARKETS: { value: StrategyMarket; label: string }[] = [
  { value: 'rise-fall', label: 'Rise/Fall' },
  { value: 'even-odd', label: 'Even/Odd' },
  { value: 'over-under', label: 'Over/Under' },
];

const DBOT_MARKETS: { value: StrategyMarket; label: string }[] = [
  { value: 'rise-fall', label: 'Rise/Fall' },
  { value: 'even-odd', label: 'Even/Odd' },
];

function getStrategies(market: StrategyMarket, variant: 'default' | 'dbot') {
  const strategies = getStrategiesForMarket(market);

  if (variant !== 'dbot') return strategies;

  if (market === 'rise-fall') {
    return strategies.filter((strategy) => strategy.id === 'mts');
  }

  if (market === 'even-odd') {
    return strategies.filter((strategy) => strategy.id === 'pis');
  }

  return [];
}

export function StrategyPanel({
  latestPrice,
  pipSize,
  symbol,
  variant = 'default',
  forcedMarket,
}: StrategyPanelProps) {
  const [isRunning, setIsRunning] = useState(true);
  const [market, setMarket] = useState<StrategyMarket>(forcedMarket ?? 'rise-fall');

  const markets = variant === 'dbot' ? DBOT_MARKETS : DEFAULT_MARKETS;

  const strategies = useMemo(() => getStrategies(market, variant), [market, variant]);

  const [strategyId, setStrategyId] = useState<StrategyId>('mts');

  useEffect(() => {
    if (!forcedMarket) return;

    const nextStrategies = getStrategies(forcedMarket, variant);
    setMarket(forcedMarket);

    if (nextStrategies[0]) {
      setStrategyId(nextStrategies[0].id);
    }
  }, [forcedMarket, variant]);

  useEffect(() => {
    if (!strategies[0]) return;

    const exists = strategies.some((strategy) => strategy.id === strategyId);

    if (!exists) {
      setStrategyId(strategies[0].id);
    }
  }, [strategies, strategyId]);

  const selectedStrategy = strategies.find((strategy) => strategy.id === strategyId) ?? strategies[0];

  const engine = useStrategyEngine({
    market,
    strategyId: selectedStrategy?.id ?? 'mts',
    latestPrice: isRunning && selectedStrategy ? latestPrice : null,
    pipSize,
    symbol,
  });

  function handleMarketChange(nextMarket: StrategyMarket) {
    const nextStrategies = getStrategies(nextMarket, variant);

    setMarket(nextMarket);

    if (nextStrategies[0]) {
      setStrategyId(nextStrategies[0].id);
    }
  }

  return (
    <div className="max-h-[32dvh] overflow-y-auto text-sm sm:max-h-none">
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-bold">{isRunning ? 'Running' : 'Stopped'}</p>
          </div>

          <Button
            size="sm"
            variant={isRunning ? 'default' : 'secondary'}
            onClick={() => setIsRunning((value) => !value)}
          >
            {isRunning ? 'ON' : 'OFF'}
          </Button>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            Market
          </label>

          {forcedMarket ? (
            <div className="w-full rounded-lg border bg-muted/40 px-3 py-2 font-bold">
              {markets.find((item) => item.value === forcedMarket)?.label ?? forcedMarket}
            </div>
          ) : (
            <select
              value={market}
              onChange={(event) => handleMarketChange(event.target.value as StrategyMarket)}
              className="w-full rounded-lg border bg-background px-3 py-2 font-bold"
            >
              {markets.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">
            Strategy
          </label>

          <div className="grid grid-cols-1 gap-2">
            {strategies.map((strategy) => (
              <button
                key={strategy.id}
                type="button"
                onClick={() => setStrategyId(strategy.id)}
                className={`rounded-lg border px-3 py-2 text-left ${
                  selectedStrategy?.id === strategy.id
                    ? 'border-primary bg-primary/10'
                    : 'bg-background'
                }`}
              >
                <div className="font-bold">{strategy.name}</div>
                <div className="text-xs text-muted-foreground">
                  {strategy.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">Signal</p>
          <p className="text-2xl font-black">
            {isRunning && selectedStrategy ? engine.result.signal : 'WAIT'}
          </p>
          <p className="mt-2 text-xs">
            {isRunning && selectedStrategy ? engine.result.reason : 'Strategy panel is OFF.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">Symbol</p>
            <p className="break-words font-bold">{symbol ?? '-'}</p>
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
            <p className="font-bold">
              {isRunning && selectedStrategy ? engine.result.confidence : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
