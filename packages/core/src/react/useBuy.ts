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
    underlying_symbol: params.symbol,
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

function mapBuyResult(response: BuyResponse): BuyResult | null {
  if (!response.buy) return null;

  return {
    contractId: Number(response.buy.contract_id),
    buyPrice: Number(response.buy.buy_price),
    payout: Number(response.buy.payout),
    longcode: response.buy.longcode,
    balanceAfter: Number(response.buy.balance_after),
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

  const buyContractFromParams = useCallback(async (params: ProposalParams) => {
    if (!ws || !isConnected) return;

    setIsBuying(true);
    setBuyError(null);
    setBuyResult(null);

    try {
      // New Deriv Options WS does NOT allow `symbol` in proposal requests.
      // It requires `underlying_symbol`. Also, buy should be made using the
      // proposal ID, not by sending contract parameters directly.
      const proposalResponse = await ws.send<ProposalResponse>(buildProposalPayload(params));

      if (!proposalResponse.proposal?.id) {
        throw new Error('Could not get contract proposal');
      }

      const askPrice = proposalResponse.proposal.ask_price ?? params.amount;

      const response = await ws.send<BuyResponse>({
        buy: proposalResponse.proposal.id,
        price: String(askPrice),
      });

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
