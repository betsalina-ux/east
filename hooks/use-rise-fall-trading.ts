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

export type UseRiseFallTradingParams = Pick<
  UseBaseTradingParams,
  'ws' | 'isConnected' | 'isExhausted' | 'isAuthenticated' | 'onAuthWSFailed'
>;

function parseBarrierValue(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const isValidBarrier =
    /^[+-]\d+(\.\d+)?$/.test(trimmed) ||
    /^\d+(\.\d+)?$/.test(trimmed);

  if (!isValidBarrier) return null;

  return trimmed;
}
function getContractForDirection({
  contractType,
  direction,
  allowEquals,
}: {
  contractType: UpDownContractType;
  direction: Direction;
  allowEquals: boolean;
}): string {
  if (contractType === 'higher-lower') {
    return direction === 'LOWER' ? 'LOWER' : 'HIGHER';
  }

  if (contractType === 'touch-no-touch') {
    return direction === 'NOTOUCH' ? 'NOTOUCH' : 'ONETOUCH';
  }

  if (allowEquals) {
    return direction === 'PUT' ? 'PUTE' : 'CALLE';
  }

  return direction === 'PUT' ? 'PUT' : 'CALL';
}

export function useRiseFallTrading({
  ws,
  isConnected,
  isExhausted,
  isAuthenticated,
  onAuthWSFailed,
}: UseRiseFallTradingParams): UseRiseFallTradingReturn {
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
  } = useBaseTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated,
    onAuthWSFailed,
    contractTypes: CONTRACT_TYPES,
  });

  const [contractType, setContractType] = useState<UpDownContractType>('rise-fall');
  const [direction, setDirection] = useState<Direction>('CALL');
  const [allowEquals, setAllowEquals] = useState<boolean>(false);
  const [barrier, setBarrier] = useState<string>('+0.1');
  const [stake, setStake] = useState<string>('10');
  const [duration, setDuration] = useState<number>(1);
  const [durationUnit, setDurationUnitRaw] = useState<DurationSelectUnit>('t');
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<string>('');
  const [durationOptionsSymbol, setDurationOptionsSymbol] = useState<string | null>(null);

  const durationOptions = useMemo(() => getDurationOptions(contracts), [contracts]);

  const durationUnitRef = useRef(durationUnit);
  const activeSymbolKeyRef = useRef(activeSymbol?.underlying_symbol);

  useEffect(() => {
    durationUnitRef.current = durationUnit;
  }, [durationUnit]);

  useEffect(() => {
    activeSymbolKeyRef.current = activeSymbol?.underlying_symbol;
  }, [activeSymbol?.underlying_symbol]);

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
      setDuration(prev =>
        prev < currentOpt.min || prev > currentOpt.max ? currentOpt.min : prev
      );
    }
  }, [durationOptions]);

  useEffect(() => {
    if (contractType === 'touch-no-touch') {
      setDirection(prev => (prev === 'NOTOUCH' ? 'NOTOUCH' : 'ONETOUCH'));
      setAllowEquals(false);
      setBarrier(prev => prev || '1');
      return;
    }

    if (contractType === 'higher-lower') {
  setDirection(prev => (prev === 'LOWER' ? 'LOWER' : 'HIGHER'));
  setAllowEquals(false);
  setBarrier(prev => prev || '+0.1');
  return;
}

    setDirection(prev => (prev === 'PUT' ? 'PUT' : 'CALL'));
  }, [contractType]);

  const setDurationUnit = useCallback(
    (unit: DurationSelectUnit) => {
      setDurationUnitRaw(unit);
      const opt = durationOptions.find(o => o.unit === unit);
      if (opt && unit !== 'end-time') setDuration(opt.min);
    },
    [durationOptions]
  );

  const {
    buyContractFromParams,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
  } = useBuy(tradingWs, tradingIsConnected);

  const proposalParams: ProposalParams | null = useMemo(() => {
    if (isBuying || !activeSymbol || !durationOptions.length) return null;
    if (durationOptionsSymbol !== activeSymbol.underlying_symbol) return null;

    const stakeNum = Number(stake);
    if (!Number.isFinite(stakeNum) || stakeNum <= 0) return null;

    const barrierNum = parseBarrierValue(barrier);

    if (contractType !== 'rise-fall' && barrierNum === null) return null;

    const contractForDirection =
      contractType === 'rise-fall' && allowEquals ? `${direction}E` : direction;

    const base = {
  contractType: contractForDirection,
  symbol: activeSymbol.underlying_symbol,
  amount: stakeNum,
  basis: 'stake' as const,
  currency: 'USD',
  ...(contractType !== 'rise-fall' && barrierNum !== null
    ? { barrier: barrierNum }
    : {}),
};

    if (durationUnit === 'end-time') {
      const dateExpiry = computeEndTimeEpoch(endDate, endTime);
      if (!dateExpiry) return null;

      return {
        ...base,
        duration: 0,
        durationUnit: 'd',
        dateExpiry,
      };
    }

    const opt = durationOptions.find(o => o.unit === durationUnit);
    if (!opt || duration < opt.min || duration > opt.max) return null;

    if (durationUnit === 'h') {
      return {
        ...base,
        duration: duration * 60,
        durationUnit: 'm',
      };
    }

    return {
      ...base,
      duration,
      durationUnit,
    };
  }, [
    activeSymbol,
    direction,
    contractType,
    allowEquals,
    barrier,
    stake,
    duration,
    durationUnit,
    endDate,
    endTime,
    isBuying,
    durationOptions,
    durationOptionsSymbol,
  ]);

  const proposal = null;

  const buildParamsForDirection = useCallback(
    (nextDirection: Direction): ProposalParams | null => {
      if (!activeSymbol || !durationOptions.length) return null;
      if (durationOptionsSymbol !== activeSymbol.underlying_symbol) return null;

      const stakeNum = Number(stake);
      if (!Number.isFinite(stakeNum) || stakeNum <= 0) return null;

      const barrierNum = parseBarrierValue(barrier);

      if (contractType !== 'rise-fall' && barrierNum === null) return null;

      const contractForDirection =
        contractType === 'rise-fall' && allowEquals ? `${nextDirection}E` : nextDirection;

      const base = {
  contractType: contractForDirection,
  symbol: activeSymbol.underlying_symbol,
  amount: stakeNum,
  basis: 'stake' as const,
  currency: 'USD',
  ...(contractType !== 'rise-fall' && barrierNum !== null
    ? { barrier: barrierNum }
    : {}),
};

      if (durationUnit === 'end-time') {
        const dateExpiry = computeEndTimeEpoch(endDate, endTime);
        if (!dateExpiry) return null;

        return {
          ...base,
          duration: 0,
          durationUnit: 'd',
          dateExpiry,
        };
      }

      const opt = durationOptions.find(o => o.unit === durationUnit);
      if (!opt || duration < opt.min || duration > opt.max) return null;

      if (durationUnit === 'h') {
        return {
          ...base,
          duration: duration * 60,
          durationUnit: 'm',
        };
      }

      return {
        ...base,
        duration,
        durationUnit,
      };
    },
    [
      activeSymbol,
      contractType,
      allowEquals,
      barrier,
      stake,
      duration,
      durationUnit,
      endDate,
      endTime,
      durationOptions,
      durationOptionsSymbol,
    ]
  );

  const buyContract = useCallback(
    async (nextDirection?: Direction) => {
      const directionToBuy = nextDirection ?? direction;
      setDirection(directionToBuy);

      const params = buildParamsForDirection(directionToBuy);

      if (params) {
        await buyContractFromParams(params);
      }
    },
    [direction, buildParamsForDirection, buyContractFromParams]
  );

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
