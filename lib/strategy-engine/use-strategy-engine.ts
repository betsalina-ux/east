'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { runStrategy } from './strategy-runner';
import type {
  StrategyCandle,
  StrategyId,
  StrategyMarket,
  StrategyResult,
  StrategyTick,
} from './types';

const COOLDOWN_MS = 15000;

function getLastDigit(price: number, pipSize: number) {
  const fixed = Number(price).toFixed(pipSize);
  return Number(fixed.replace('.', '').slice(-1));
}

function getMinuteBucket(time = Date.now()) {
  return Math.floor(time / 60000) * 60000;
}

function getCandleDirection(open: number, close: number): StrategyCandle['direction'] {
  if (close > open) return 'GREEN';
  if (close < open) return 'RED';
  return 'DOJI';
}

interface UseStrategyEngineParams {
  market: StrategyMarket;
  strategyId: StrategyId;
  latestPrice: number | null;
  pipSize: number;
  symbol?: string;
}

export function useStrategyEngine({
  market,
  strategyId,
  latestPrice,
  pipSize,
  symbol,
}: UseStrategyEngineParams) {
  const [ticks, setTicks] = useState<StrategyTick[]>([]);
  const [candles, setCandles] = useState<StrategyCandle[]>([]);
  const [currentCandle, setCurrentCandle] = useState<StrategyCandle | null>(null);
  const [lastSignalAt, setLastSignalAt] = useState(0);

  const lastPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (latestPrice === null || Number.isNaN(latestPrice)) return;
    if (lastPriceRef.current === latestPrice) return;

    lastPriceRef.current = latestPrice;

    const now = Date.now();
    const digit = getLastDigit(latestPrice, pipSize);

    setTicks(prev => {
      const next = [...prev, { price: latestPrice, digit, epoch: now }];
      return next.slice(-200);
    });

    setCurrentCandle(prev => {
      const bucket = getMinuteBucket(now);

      if (!prev) {
        return {
          open: latestPrice,
          high: latestPrice,
          low: latestPrice,
          close: latestPrice,
          direction: 'DOJI',
          startTime: bucket,
          endTime: bucket + 60000,
        };
      }

      if (bucket !== prev.startTime) {
        const closed: StrategyCandle = {
          ...prev,
          direction: getCandleDirection(prev.open, prev.close),
        };

        setCandles(old => [...old, closed].slice(-50));

        return {
          open: latestPrice,
          high: latestPrice,
          low: latestPrice,
          close: latestPrice,
          direction: 'DOJI',
          startTime: bucket,
          endTime: bucket + 60000,
        };
      }

      const next = {
        ...prev,
        high: Math.max(prev.high, latestPrice),
        low: Math.min(prev.low, latestPrice),
        close: latestPrice,
      };

      return {
        ...next,
        direction: getCandleDirection(next.open, next.close),
      };
    });
  }, [latestPrice, pipSize]);

  const result: StrategyResult = useMemo(() => {
  const now = Date.now();
  const cooldownRemaining = Math.max(0, COOLDOWN_MS - (now - lastSignalAt));

  return runStrategy({
    market,
    strategyId,
    ticks,
    candles,
    currentCandle,
    cooldownRemaining,
  });
}, [market, strategyId, ticks, candles, currentCandle, lastSignalAt]);

  return {
    symbol,
    ticks,
    candles,
    currentCandle,
    result,
    setLastSignalAt,
  };
}
