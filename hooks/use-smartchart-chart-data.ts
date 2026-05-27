'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ActiveSymbol, DerivWS } from '@deriv/core';

export interface SmartChartsSymbol {
  symbol: string;
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
  symbol_type: string;
}

export type TradingTimesMap = Record<
  string,
  {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    delay_amount: number;
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
          underlying_symbol?: string;
          symbol?: string;
          times: { open: string[]; close: string[] };
        }>;
      }>;
    }>;
  };
}

function buildTradingTimesMap(response: TradingTimesResponse): TradingTimesMap {
  const markets = response?.trading_times?.markets;
  if (!markets) return {};

  const map: TradingTimesMap = {};
  const now = new Date();
  const dateStr = now.toISOString().substring(0, 11);

  for (const market of markets) {
    market.submarkets?.forEach(submarket => {
      submarket.symbols?.forEach(symbolObj => {
        const symbol = symbolObj.underlying_symbol || symbolObj.symbol;
        const times = symbolObj.times;

        if (!symbol || !times) return;

        const open = times.open ?? [];
        const close = times.close ?? [];

        let isOpen = true;
        let openTime = '';
        let closeTime = '';

        if (open.length > 0 && close.length > 0 && open[0] !== '--' && close[0] !== '--') {
          openTime = `${dateStr}${open[0]}Z`;
          closeTime = `${dateStr}${close[0]}Z`;

          const openDate = new Date(openTime);
          const closeDate = new Date(closeTime);

          isOpen = now >= openDate && now < closeDate;
        }

        map[symbol] = {
          isOpen,
          openTime,
          closeTime,
          delay_amount: 0,
        };
      });
    });
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
    if (!ws || !isConnected) return;

    let cancelled = false;

    ws.send({ trading_times: 'today' })
      .then(response => {
        if (cancelled) return;
        setTradingTimes(buildTradingTimesMap(response as TradingTimesResponse));
      })
      .catch(() => {
        if (cancelled) return;
        setTradingTimes({});
      });

    return () => {
      cancelled = true;
    };
  }, [ws, isConnected]);

  const chartData = useMemo((): SmartChartChartData | undefined => {
    if (symbols.length === 0 || !tradingTimes) return undefined;

    const activeSymbols: SmartChartsSymbol[] = symbols
      .filter(s => !!s.underlying_symbol)
      .map(s => ({
        symbol: s.underlying_symbol,
        display_name: s.underlying_symbol_name ?? s.underlying_symbol,
        exchange_is_open: (s.exchange_is_open ?? 1) as 0 | 1,
        is_trading_suspended: (s.is_trading_suspended ?? 0) as 0 | 1,
        market: s.market ?? '',
        market_display_name: s.market_display_name ?? s.market ?? '',
        pip: s.pip_size ?? 0.01,
        subgroup: s.subgroup ?? '',
        subgroup_display_name: s.subgroup_display_name ?? s.subgroup ?? '',
        submarket: s.submarket ?? '',
        submarket_display_name: s.submarket_display_name ?? s.submarket ?? '',
        symbol_type: s.underlying_symbol_type ?? '',
      }));

    const filledTradingTimes: TradingTimesMap = { ...tradingTimes };

    for (const s of activeSymbols) {
      filledTradingTimes[s.symbol] = {
        isOpen: filledTradingTimes[s.symbol]?.isOpen ?? !!s.exchange_is_open,
        openTime: filledTradingTimes[s.symbol]?.openTime ?? '',
        closeTime: filledTradingTimes[s.symbol]?.closeTime ?? '',
        delay_amount: filledTradingTimes[s.symbol]?.delay_amount ?? 0,
      };
    }

    return {
      tradingTimes: filledTradingTimes,
      activeSymbols,
    };
  }, [tradingTimes, symbols]);

  return { chartData };
}
