'use client';

import { useCallback } from 'react';
import type { DerivWS } from '@deriv/core';
import { useOpenPositions } from './use-open-positions';
import { useClosedPositions } from './use-closed-positions';
import { useSellContract } from './use-sell-contract';

interface UseReportsTradingParams {
  ws: DerivWS | null;
  isConnected: boolean;
  isAuthenticated: boolean;
}

export function useReportsTrading({
  ws,
  isConnected,
  isAuthenticated,
}: UseReportsTradingParams) {
  const { positions: openPositions } = useOpenPositions(
    ws,
    isConnected,
    isAuthenticated
  );

  const { positions: closedPositions, refresh: refreshClosedPositions } =
    useClosedPositions(ws, isConnected, isAuthenticated);

  const {
    sellContract: sellContractRaw,
    sellingId,
    sellError,
    clearSellError,
  } = useSellContract(ws, isConnected);

  const sellContract = useCallback(
    async (contractId: number, bidPrice: string) => {
      await sellContractRaw(contractId, bidPrice);
      await refreshClosedPositions();
    },
    [sellContractRaw, refreshClosedPositions]
  );

  return {
    openPositions,
    closedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  };
}
