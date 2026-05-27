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

export type TradingTimesMap = Record<
  string,
  {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  }
>;

export interface SmartChartChartData {
  tradingTimes: TradingTimesMap;
  activeSymbols: SmartChartsSymbol[];
}

interface TradingTimesResponse {
  trading_times?: {
    markets?: Array<{
      submarkets?: Array<{
        symbols?: Array<{
          symbol?: string;
          underlying_symbol?: string;
          times?: {
            open?: string[];
            close?: string[];
          };
        }>;
      }>;
    }>;
  };
}

function buildTradingTimesMap(response: TradingTimesResponse, symbols: ActiveSymbol[]): TradingTimesMap {
  const map: TradingTimesMap = {};
  const markets = response?.trading_times?.markets ?? [];
  const todayPrefix = new Date().toISOString().slice(0, 11);

  for (const market of markets) {
    for (const submarket of market.submarkets ?? []) {
      for (const item of submarket.symbols ?? []) {
        const symbol = item.symbol ?? item.underlying_symbol;
        if (!symbol) continue;

        const open = item.times?.open?.[0];
        const close = item.times?.close?.[0];

        map[symbol] = {
          isOpen: open !== '--' && close !== '--',
          openTime: open && open !== '--' ? `${todayPrefix}${open}Z` : '',
          closeTime: close && close !== '--' ? `${todayPrefix}${close}Z` : '',
        };
      }
    }
  }

  for (const s of symbols) {
    const symbol = s.underlying_symbol;
    if (!symbol) continue;

    if (!map[symbol]) {
      map[symbol] = {
        isOpen: !!(s.exchange_is_open ?? 1),
        openTime: '',
        closeTime: '',
      };
    }
  }

  return map;
}

export function useSmartChartChartData(
  ws: DerivWS | null,
  isConnected: boolean,
  symbols: ActiveSymbol[]
): { chartData: SmartChartChartData | undefined } {
  const [tradingTimes, setTradingTimes] = useState<TradingTimesMap | undefined>();

  useEffect(() => {
    if (!ws || !isConnected || symbols.length === 0) return;

    let cancelled = false;

    ws
      .send({ trading_times: 'today' })
      .then(response => {
        if (cancelled) return;
        setTradingTimes(buildTradingTimesMap(response as TradingTimesResponse, symbols));
      })
      .catch(() => {
        if (cancelled) return;
        setTradingTimes(buildTradingTimesMap({}, symbols));
      });

    return () => {
      cancelled = true;
    };
  }, [ws, isConnected, symbols]);

  const chartData = useMemo((): SmartChartChartData | undefined => {
    if (symbols.length === 0 || !tradingTimes) return undefined;

    const activeSymbols: SmartChartsSymbol[] = symbols
      .filter(s => !!s.underlying_symbol)
      .map(s => {
        const symbol = s.underlying_symbol;
        const pip = Number(s.pip_size ?? 0.01);

        return {
          allow_forward_starting: 0,
          display_name: s.underlying_symbol_name ?? symbol,
          exchange_is_open: (s.exchange_is_open ?? 1) as 0 | 1,
          is_trading_suspended: (s.is_trading_suspended ?? 0) as 0 | 1,
          market: s.market ?? 'synthetic_index',
          market_display_name: s.market_display_name ?? s.market ?? 'Synthetic Indices',
          pip: Number.isFinite(pip) && pip > 0 ? pip : 0.01,
          subgroup: s.subgroup ?? '',
          subgroup_display_name: s.subgroup_display_name ?? s.subgroup ?? '',
          submarket: s.submarket ?? '',
          submarket_display_name: s.submarket_display_name ?? s.submarket ?? '',
          symbol,
          symbol_type: s.underlying_symbol_type ?? 'stockindex',
        };
      });

    return {
      tradingTimes,
      activeSymbols,
    };
  }, [tradingTimes, symbols]);

  return { chartData };
}
