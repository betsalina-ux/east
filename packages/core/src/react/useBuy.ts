'use client';

import { useState, useCallback } from 'react';
import type { DerivWS } from '../ws';
import type { ProposalInfo, ProposalResponse, ProposalParams, BuyResponse, BuyResult } from '../types';

interface UseBuyReturn {
  buyContract: (proposal: ProposalInfo) => Promise<void>;
  buyContractFromParams: (params: ProposalParams) => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
}

function buildProposalPayload(params: ProposalParams): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    proposal: 1,
    amount: params.amount,
    basis: params.basis,
    contract_type: params.contractType,
    currency: params.currency,
    symbol: params.symbol,
  };

  if (params.dateExpiry !== undefined) {
    payload.date_expiry = params.dateExpiry;
  } else {
    payload.duration = params.duration;
    payload.duration_unit = params.durationUnit;
  }

  if (params.barrier !== undefined) {
    payload.barrier = params.barrier;
  }

  return payload;
}

function buildDirectBuyPayload(params: ProposalParams): Record<string, unknown> {
  const parameters: Record<string, unknown> = {
    amount: params.amount,
    basis: params.basis,
    contract_type: params.contractType,
    currency: params.currency,
    symbol: params.symbol,
  };

  if (params.dateExpiry !== undefined) {
    parameters.date_expiry = params.dateExpiry;
  } else {
    parameters.duration = params.duration;
    parameters.duration_unit = params.durationUnit;
  }

  if (params.barrier !== undefined) {
    parameters.barrier = params.barrier;
  }

  return {
    buy: 1,
    price: String(params.amount),
    parameters,
  };
}

function mapBuyResult(response: BuyResponse): BuyResult | null {
  if (!response.buy) return null;
  return {
    contractId: response.buy.contract_id,
    buyPrice: response.buy.buy_price,
    payout: response.buy.payout,
    longcode: response.buy.longcode,
    balanceAfter: response.buy.balance_after,
  };
}

export function useBuy(
  ws: DerivWS | null,
  isConnected: boolean
): UseBuyReturn {
  const [isBuying, setIsBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<BuyResult | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  const clearBuyResult = useCallback(() => {
    setBuyResult(null);
    setBuyError(null);
  }, []);

  const buyContract = useCallback(async (proposal: ProposalInfo) => {
    if (!ws || !isConnected) return;

    setIsBuying(true);
    setBuyError(null);
    setBuyResult(null);

    try {
      const response = await ws.send<BuyResponse>({
        buy: proposal.id,
        price: String(proposal.askPrice),
      });

      const result = mapBuyResult(response);
      if (result) setBuyResult(result);
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setIsBuying(false);
    }
  }, [ws, isConnected]);

  const buyContractFromParams = useCallback(async (params: ProposalParams) => {
    if (!ws || !isConnected) return;

    setIsBuying(true);
    setBuyError(null);
    setBuyResult(null);

    try {
      // First try the one-click buy format. This lets the button click choose
      // Rise/Fall or the digit contract immediately, without waiting for React
      // state and a streaming proposal to refresh.
      let response: BuyResponse | null = null;

      try {
        response = await ws.send<BuyResponse>(buildDirectBuyPayload(params));
      } catch {
        // Some Deriv environments only accept buy-by-proposal-id. Fall back to
        // a one-shot proposal request, then buy the returned proposal ID.
        const proposalResponse = await ws.send<ProposalResponse>(buildProposalPayload(params));
        if (!proposalResponse.proposal) {
          throw new Error('Could not get contract proposal');
        }

        response = await ws.send<BuyResponse>({
          buy: proposalResponse.proposal.id,
          price: String(proposalResponse.proposal.ask_price),
        });
      }

      const result = mapBuyResult(response);
      if (result) {
        setBuyResult(result);
        window.dispatchEvent(new CustomEvent('marketeye:refresh-accounts'));
      }
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setIsBuying(false);
    }
  }, [ws, isConnected]);

  return { buyContract, buyContractFromParams, isBuying, buyResult, buyError, clearBuyResult };
}
