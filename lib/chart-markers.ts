'use strict';

import type { OpenPosition } from '@/hooks/use-open-positions';

export type ContractMarkerType =
  | 'TickContract'
  | 'NonTickContract'
  | 'AccumulatorContract';

export type MarkerDirection = 'up' | 'down';

export interface MarkerPoint {
  epoch: number;
  quote?: number | null;
  type: string;
  direction?: MarkerDirection;
  text?: string;
  textType?: string;
  displayOffsetY?: number;
  color?: string;
}

export interface ContractMarker {
  type: ContractMarkerType;
  markers: MarkerPoint[];
  props: {
    isProfit: boolean;
    isRunning: boolean;
    contractMarkerLeftPadding: number;
    markerLabel: string | null;
  };
  direction: MarkerDirection;
  profitAndLossText: string | null;
  currentEpoch: number | null;
}

const ACCUMULATOR_TYPES = new Set(['ACCU']);

const UP_CONTRACTS = new Set(['CALL', 'CALLE', 'HIGHER', 'ONETOUCH']);
const DOWN_CONTRACTS = new Set(['PUT', 'PUTE', 'LOWER', 'NOTOUCH']);

const BARRIER_CONTRACTS = new Set(['HIGHER', 'LOWER', 'ONETOUCH', 'NOTOUCH']);

function getMarkerContractType(
  contractType: string,
  tickCount: number
): ContractMarkerType {
  if (ACCUMULATOR_TYPES.has(contractType)) {
    return 'AccumulatorContract';
  }

  return tickCount > 0 ? 'TickContract' : 'NonTickContract';
}

function getMarkerDirection(contractType: string): MarkerDirection {
  if (UP_CONTRACTS.has(contractType)) return 'up';
  if (DOWN_CONTRACTS.has(contractType)) return 'down';
  return 'up';
}

function formatProfitLossText(profit: string, currency: string): string | null {
  const numericProfit = Number(profit);
  if (!Number.isFinite(numericProfit)) return null;

  const sign = numericProfit > 0 ? '+' : '';
  return `${sign}${numericProfit.toFixed(2)} ${currency}`;
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getBarrierQuote(position: OpenPosition): number | null {
  const entrySpot = parseNumber(position.entry_spot);
  const barrierRaw = position.barrier;

  if (entrySpot === null || barrierRaw === undefined || barrierRaw === null) {
    return null;
  }

  const barrierText = String(barrierRaw).trim();
  if (!barrierText) return null;

  if (barrierText.startsWith('+') || barrierText.startsWith('-')) {
    const offset = Number(barrierText);
    if (!Number.isFinite(offset)) return null;
    return entrySpot + offset;
  }

  const absolute = Number(barrierText);
  return Number.isFinite(absolute) ? absolute : null;
}

function getMarkerQuote(position: OpenPosition): number | null {
  const contractType = position.contract_type ?? '';
  const entrySpot = parseNumber(position.entry_spot);

  if (BARRIER_CONTRACTS.has(contractType)) {
    return getBarrierQuote(position) ?? entrySpot;
  }

  return entrySpot;
}

export function calculateMarkerFromPosition(
  position: OpenPosition,
  isLastContract = false,
  isMobile = false
): ContractMarker | null {
  if (!position.date_start) return null;

  const contractType = position.contract_type ?? '';
  const tickCount = position.tick_count ?? 0;
  const type = getMarkerContractType(contractType, tickCount);
  const direction = getMarkerDirection(contractType);
  const profitAndLossText = formatProfitLossText(position.profit, position.currency);

  const entrySpotTime = position.entry_tick_time ?? position.date_start;
  const entrySpotQuote = parseNumber(position.entry_spot);
  const markerQuote = getMarkerQuote(position);

  const profit = Number(position.profit);
  const isProfit = Number.isFinite(profit) ? profit >= 0 : true;
  const isRunning = !position.is_sold && !position.is_expired;

  const contractMarkerLeftPadding = isMobile ? 10 : 100;
  const isAccumulator = type === 'AccumulatorContract';
  const isTickContract = type === 'TickContract';

  const markers: MarkerPoint[] = [];

  if (markerQuote !== null) {
    markers.push({
      epoch: entrySpotTime,
      quote: markerQuote,
      type: 'entrySpot',
      direction,
    });
  }

  const isContractClosed = !!position.is_sold || !!position.is_expired;
  const exitSpotTime = position.exit_spot_time ?? null;
  const exitSpotQuote = parseNumber(position.exit_spot);

  if (!isAccumulator) {
    if (isContractClosed) {
      if (exitSpotTime !== null && exitSpotQuote !== null) {
        markers.push({
          epoch: exitSpotTime,
          quote: exitSpotQuote,
          type: 'exitSpot',
          direction,
        });

        if (profitAndLossText !== null) {
          const exitAboveEntry =
            entrySpotQuote !== null ? exitSpotQuote >= entrySpotQuote : true;

          markers.push({
            epoch: exitSpotTime,
            quote: exitSpotQuote,
            type: 'profitAndLossLabel',
            direction,
            displayOffsetY: exitAboveEntry ? -24 : 24,
          });
        }
      }
    } else {
      if (markerQuote !== null) {
        markers.push({
          epoch: position.date_start,
          quote: markerQuote,
          type: 'startTimeCollapsed',
          direction,
        });
      }

      if (isLastContract) {
        markers.push({
          epoch: position.date_start,
          ...(markerQuote !== null ? { quote: markerQuote } : {}),
          type: 'startTime',
          direction,
        });
      }

      if (markerQuote !== null) {
        const tickPassed = position.tick_stream?.length ?? 0;
        const tickCounterText = isTickContract ? `${tickPassed}/${tickCount}` : undefined;

        markers.push({
          epoch: position.date_start,
          quote: markerQuote,
          type: 'contractMarker',
          direction,
          ...(tickCounterText ? { text: tickCounterText, textType: 'counter' } : {}),
        });
      }

      if (position.date_expiry) {
        markers.push({
          epoch: position.date_expiry,
          quote: markerQuote ?? 0,
          type: 'exitTimeCollapsed',
          direction,
        });
      }
    }
  } else {
    if (isContractClosed) {
      if (exitSpotTime !== null && exitSpotQuote !== null) {
        markers.push({
          epoch: exitSpotTime,
          quote: exitSpotQuote,
          type: 'exitSpot',
          direction,
        });

        if (profitAndLossText !== null) {
          const exitAboveEntry =
            entrySpotQuote !== null ? exitSpotQuote >= entrySpotQuote : true;

          markers.push({
            epoch: exitSpotTime,
            quote: exitSpotQuote,
            type: 'profitAndLossLabel',
            direction,
            displayOffsetY: exitAboveEntry ? -24 : 24,
          });
        }
      }
    } else if (isLastContract) {
      markers.push({
        epoch: position.date_start,
        quote: markerQuote ?? 0,
        type: 'startTime',
        direction,
      });
    }
  }

  const currentEpoch = position.current_spot_time ?? Math.floor(Date.now() / 1000);

  return {
    type,
    markers,
    props: {
      isProfit,
      isRunning,
      contractMarkerLeftPadding,
      markerLabel: null,
    },
    direction,
    profitAndLossText,
    currentEpoch,
  };
}

export function calculateContractMarkers(
  positions: OpenPosition[],
  activeSymbol: string | undefined,
  isMobile = false
): ContractMarker[] {
  if (!activeSymbol || positions.length === 0) return [];

  const filtered = positions.filter(
    (p) => p.underlying_symbol === activeSymbol
  );

  if (filtered.length === 0) return [];

  const sorted = [...filtered].sort(
    (a, b) => (b.date_start ?? 0) - (a.date_start ?? 0)
  );

  const markers: ContractMarker[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const marker = calculateMarkerFromPosition(sorted[i], i === 0, isMobile);
    if (marker) markers.push(marker);
  }

  return markers;
}
