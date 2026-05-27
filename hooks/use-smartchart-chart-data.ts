'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ActiveSymbol, DerivWS } from '@deriv/core';

export interface SmartChartsSymbol {
  allow_forward_starting: 0 | 1;
  display_name: string;
  exchange_is_open: 0 | 1;
  is_trading_suspended: 0 | 1;
  market: string;
  market_display_name: string;
  pip: number;
  subgroup: string;
  subgroup_display_name: string;
  submarket: string;
  submarket_display_name: string;
  symbol: string;
  symbol_type: string;
}

export interface TradingTimesResponse {
  trading_times?: {
    markets?: Array<{
      name?: string;
      submarkets?: Array<{
        name?: string;
        symbols?: Array<{
          name?: string;
          symbol?: string;
          underlying_symbol?: string;
          times?: {
            open?: string[];
            close?: string[];
            settlement?: string;
          };
          trading_days?: string[];
          events?: unknown[];
          delay_amount?: number;
        }>;
      }>;
    }>;
  };
}

export interface SmartChartChartData {
  tradingTimes: TradingTimesResponse;
  activeSymbols: SmartChartsSymbol[];
}

function normalizeTradingTimes(response: TradingTimesResponse): TradingTimesResponse {
  const markets = response?.trading_times?.markets ?? [];

  return {
    trading_times: {
      markets: markets.map(market => ({
        ...market,
        submarkets: (market.submarkets ?? []).map(submarket => ({
          ...submarket,
          symbols: (submarket.symbols ?? []).map(symbolInfo => {
            const symbol = symbolInfo.symbol ?? symbolInfo.underlying_symbol ?? '';
            return {
              ...symbolInfo,
              name: symbolInfo.name ?? symbol,
              symbol,
              times: {
                open: symbolInfo.times?.open ?? ['00:00:00'],
                close: symbolInfo.times?.close ?? ['23:59:59'],
                settlement: symbolInfo.times?.settlement ?? '23:59:59',
              },
              trading_days: symbolInfo.trading_days ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              events: symbolInfo.events ?? [],
              delay_amount: symbolInfo.delay_amount ?? 0,
            };
          }),
        })),
      })),
    },
  };
}

export function useSmartChartChartData(
  ws: DerivWS | null,
  isConnected: boolean,
  symbols: ActiveSymbol[]
): { chartData: SmartChartChartData | undefined } {
  const [tradingTimes, setTradingTimes] = useState<TradingTimesResponse | undefined>();

  useEffect(() => {
    if (!ws || !isConnected) return;

    let cancelled = false;

    ws
      .send({ trading_times: 'today' })
      .then(response => {
        if (cancelled) return;
        setTradingTimes(normalizeTradingTimes(response as TradingTimesResponse));
      })
      .catch(() => {
        if (cancelled) return;
        setTradingTimes({ trading_times: { markets: [] } });
      });

    return () => {
      cancelled = true;
    };
  }, [ws, isConnected]);

  const chartData = useMemo((): SmartChartChartData | undefined => {
    if (symbols.length === 0 || !tradingTimes) return undefined;

    const activeSymbols: SmartChartsSymbol[] = symbols
      .filter(s => !!s.underlying_symbol)
      .map(s => {
        const symbol = s.underlying_symbol;
        return {
          allow_forward_starting: 0,
          display_name: s.underlying_symbol_name ?? symbol,
          exchange_is_open: (s.exchange_is_open ?? 1) as 0 | 1,
          is_trading_suspended: (s.is_trading_suspended ?? 0) as 0 | 1,
          market: s.market ?? '',
          market_display_name: s.market_display_name ?? s.market ?? '',
          pip: Number(s.pip_size ?? 0.01),
          subgroup: s.subgroup ?? '',
          subgroup_display_name: s.subgroup_display_name ?? s.subgroup ?? '',
          submarket: s.submarket ?? '',
          submarket_display_name: s.submarket_display_name ?? s.submarket ?? '',
          symbol,
          symbol_type: s.underlying_symbol_type ?? '',
        };
      });

    return {
      tradingTimes,
      activeSymbols,
    };
  }, [tradingTimes, symbols]);

  return { chartData };
}
