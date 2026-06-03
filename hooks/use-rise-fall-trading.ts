'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useBuy } from '@deriv/core';
import type {
  DerivWS,
  ActiveSymbol,
  Tick,
  ProposalInfo,
  ProposalParams,
  BuyResult,
} from '@deriv/core';
import { useBaseTrading } from '@/hooks/use-base-trading';
import type { UseBaseTradingParams } from '@/hooks/use-base-trading';
import type { Direction, UpDownContractType, DurationSelectUnit, DurationOption, OpenPosition, ClosedPosition } from '../lib/types';
import { getDurationOptions, computeEndTimeEpoch } from '@/lib/duration-utils';

const CONTRACT_TYPES = ['CALL', 'PUT', 'CALLE', 'PUTE', 'ONETOUCH', 'NOTOUCH'];

interface UseRiseFallTradingReturn {
  ws: DerivWS | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  prices: number[];
  pipSize: number;
  contractType: UpDownContractType;
  setContractType: (value: UpDownContractType) => void;
  direction: Direction;
  setDirection: (direction: Direction) => void;
  allowEquals: boolean;
  setAllowEquals: (value: boolean) => void;
  barrier: string;
  setBarrier: (value: string) => void;
  stake: string;
  setStake: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  durationOptions: DurationOption[];
  durationUnit: DurationSelectUnit;
  setDurationUnit: (unit: DurationSelectUnit) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  proposal: ProposalInfo | null;
  buyContract: (direction?: Direction) => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  openPositions: OpenPosition[];
  closedPositions: ClosedPosition[];
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  sellError: string | null;
  clearSellError: () => void;
}

export type UseRiseFallTradingParams = Pick<UseBaseTradingParams, 'ws' | 'isConnected' | 'isExhausted' | 'isAuthenticated' | 'onAuthWSFailed'>;

export function useRiseFallTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed }: UseRiseFallTradingParams): UseRiseFallTradingReturn {
  const {
    ws: tradingWs,
    isConnected: tradingIsConnected,
    isLoading,
    error,
    symbols,
    activeSymbol,
    selectSymbol,
    currentTick,
    prices,
    pipSize,
    contracts,
    openPositions,
    closedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  } = useBaseTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed, contractTypes: CONTRACT_TYPES });

  const [contractType, setContractType] = useState<UpDownContractType>('rise-fall');
  const [direction, setDirection] = useState<Direction>('CALL');
  const [allowEquals, setAllowEquals] = useState<boolean>(false);
  const [barrier, setBarrier] = useState<string>('0.1');
  const [stake, setStake] = useState<string>('10');
  const [duration, setDuration] = useState<number>(1);
  const [durationUnit, setDurationUnitRaw] = useState<DurationSelectUnit>('t');
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<string>('');
  const [durationOptionsSymbol, setDurationOptionsSymbol] = useState<string | null>(null);

  const durationOptions = useMemo(() => getDurationOptions(contracts), [contracts]);

  // Track durationUnit and activeSymbol in refs so the duration-options effect doesn't list them in deps
  const durationUnitRef = useRef(durationUnit);
  const activeSymbolKeyRef = useRef(activeSymbol?.underlying_symbol);

  useEffect(() => {
    durationUnitRef.current = durationUnit;
  }, [durationUnit]);

  useEffect(() => {
    activeSymbolKeyRef.current = activeSymbol?.underlying_symbol;
  }, [activeSymbol?.underlying_symbol]);

  /* eslint-disable react-hooks/set-state-in-effect -- reset duration/end-time state when contracts-derived options change */
  useEffect(() => {
    if (!durationOptions.length) return;
    setEndDate(undefined);
    setEndTime('');
    setDurationOptionsSymbol(activeSymbolKeyRef.current ?? null);
    const currentOpt = durationOptions.find(o => o.unit === durationUnitRef.current);
    if (!currentOpt) {
      const first = durationOptions[0];
      setDurationUnitRaw(first.unit);
      if (first.unit !== 'end-time') setDuration(first.min);
    } else if (currentOpt.unit !== 'end-time') {
      setDuration(prev => (prev < currentOpt.min || prev > currentOpt.max) ? currentOpt.min : prev);
    }
  }, [durationOptions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (contractType === 'touch-no-touch') {
      setDirection(prev => (prev === 'NOTOUCH' ? 'NOTOUCH' : 'ONETOUCH'));
      setAllowEquals(false);
    } else {
      setDirection(prev => (prev === 'PUT' ? 'PUT' : 'CALL'));
      if (contractType !== 'rise-fall') setAllowEquals(false);
    }
  }, [contractType]);

  const setDurationUnit = useCallback((unit: DurationSelectUnit) => {
    setDurationUnitRaw(unit);
    const opt = durationOptions.find(o => o.unit === unit);
    if (opt && unit !== 'end-time') setDuration(opt.min);
  }, [durationOptions]);

  const { buyContract: buyWithProposal, buyContractFromParams, isBuying, buyResult, buyError, clearBuyResult } =
    useBuy(tradingWs, tradingIsConnected);

  const proposalParams: ProposalParams | null = useMemo(() => {
    if (isBuying || !activeSymbol || !durationOptions.length) return null;
    if (durationOptionsSymbol !== activeSymbol.underlying_symbol) return null;
    const stakeNum = parseFloat(stake);
    if (!stakeNum || stakeNum <= 0) return null;

    const normalizedBarrier = barrier.trim();

if (contractType !== 'rise-fall') {
  if (!normalizedBarrier) return null;

  const isValidBarrier =
    /^[+-]\d+(\.\d+)?$/.test(normalizedBarrier) ||
    /^\d+(\.\d+)?$/.test(normalizedBarrier);

  if (!isValidBarrier) return null;
}
    const base = {
      contractType: contractType === 'rise-fall' && allowEquals ? `${direction}E` : direction,
      symbol: activeSymbol.underlying_symbol,
      amount: stakeNum,
      basis: 'stake' as const,
      currency: 'USD',
      ...(contractType !== 'rise-fall' ? { barrier: normalizedBarrier } : {}),
    };

    if (durationUnit === 'end-time') {
      const dateExpiry = computeEndTimeEpoch(endDate, endTime);
      if (!dateExpiry) return null;
      return { ...base, duration: 0, durationUnit: 'd', dateExpiry };
    }

    const opt = durationOptions.find(o => o.unit === durationUnit);
    if (!opt || duration < opt.min || duration > opt.max) return null;

    if (durationUnit === 'h') {
      return { ...base, duration: duration * 60, durationUnit: 'm' };
    }

    return { ...base, duration, durationUnit };
  }, [activeSymbol, direction, contractType, allowEquals, barrier, stake, duration, durationUnit, endDate, endTime, isBuying, durationOptions, durationOptionsSymbol]);

  // Do not keep a live proposal subscription here. The new Options WS validates
  // proposal streams strictly and was showing: "Properties not allowed: symbol".
  // We build the exact contract params and buy on button click instead.
  const proposal = null;

  const buildParamsForDirection = useCallback((nextDirection: Direction): ProposalParams | null => {
    if (!activeSymbol || !durationOptions.length) return null;
    if (durationOptionsSymbol !== activeSymbol.underlying_symbol) return null;
    const stakeNum = parseFloat(stake);
    if (!stakeNum || stakeNum <= 0) return null;

    const normalizedBarrier = barrier.trim();

if (contractType !== 'rise-fall') {
  if (!normalizedBarrier) return null;

  const isValidBarrier =
    /^[+-]\d+(\.\d+)?$/.test(normalizedBarrier) ||
    /^\d+(\.\d+)?$/.test(normalizedBarrier);

  if (!isValidBarrier) return null;
}
    const base = {
      contractType: contractType === 'rise-fall' && allowEquals ? `${nextDirection}E` : nextDirection,
      symbol: activeSymbol.underlying_symbol,
      amount: stakeNum,
      basis: 'stake' as const,
      currency: 'USD',
     ...(contractType !== 'rise-fall' ? { barrier: normalizedBarrier } : {}),
    };

    if (durationUnit === 'end-time') {
      const dateExpiry = computeEndTimeEpoch(endDate, endTime);
      if (!dateExpiry) return null;
      return { ...base, duration: 0, durationUnit: 'd', dateExpiry };
    }

    const opt = durationOptions.find(o => o.unit === durationUnit);
    if (!opt || duration < opt.min || duration > opt.max) return null;

    if (durationUnit === 'h') {
      return { ...base, duration: duration * 60, durationUnit: 'm' };
    }

    return { ...base, duration, durationUnit };
  }, [activeSymbol, contractType, allowEquals, barrier, stake, duration, durationUnit, endDate, endTime, durationOptions, durationOptionsSymbol]);

  const buyContract = useCallback(async (nextDirection?: Direction) => {
    const directionToBuy = nextDirection ?? direction;
    setDirection(directionToBuy);
    const params = buildParamsForDirection(directionToBuy);
    if (params) await buyContractFromParams(params);
  }, [direction, buildParamsForDirection, buyContractFromParams]);

  return {
    ws: tradingWs,
    isConnected: tradingIsConnected,
    isLoading,
    error,
    symbols,
    activeSymbol,
    selectSymbol,
    currentTick,
    prices,
    pipSize,
    contractType,
    setContractType,
    direction,
    setDirection,
    allowEquals,
    setAllowEquals,
    barrier,
    setBarrier,
    stake,
    setStake,
    duration,
    setDuration,
    durationOptions,
    durationUnit,
    setDurationUnit,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    proposal,
    buyContract,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
    openPositions,
    closedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  };
}
