'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DerivWS } from '@deriv/core';

export interface OpenPosition {
  contract_id: number;
  contract_type: string;
  buy_price: string;
  bid_price: string;
  payout: string;
  profit: string;
  profit_percentage: number;
  longcode: string;
  underlying_symbol: string;
  barrier: string | undefined;
  currency: string;
  date_start: number;
  date_expiry: number;
  status: string;
  is_expired: number;
  is_sold: number;
  is_valid_to_sell: number;
  tick_count: number;
  tick_stream?: Array<{ epoch: number; tick: number; tick_display_value: string }>;
  entry_spot?: number;
  entry_tick_time?: number;
  current_spot_time?: number;
  exit_spot?: number;
  exit_spot_time?: number;
}

const CLOSED_POSITION_TTL_MS = 1500;

type OpenContractSubscriptionState = {
  count: number;
  active: boolean;
  subscribing: boolean;
};

const openContractSubscriptions = new WeakMap<DerivWS, OpenContractSubscriptionState>();

function isAlreadySubscribedError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error ?? '');

  return message.toLowerCase().includes('already subscribed');
}

export function useOpenPositions(
  ws: DerivWS | null,
  isConnected: boolean,
  isAuthenticated: boolean
) {
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const removalTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleRemoval = useCallback((contractId: number) => {
    const existing = removalTimers.current.get(contractId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setPositions((prev) => prev.filter((p) => p.contract_id !== contractId));
      removalTimers.current.delete(contractId);
    }, CLOSED_POSITION_TTL_MS);

    removalTimers.current.set(contractId, timer);
  }, []);

  useEffect(() => {
    if (!ws || !isConnected || !isAuthenticated) {
      setPositions([]);
      return;
    }

    const timers = removalTimers.current;

    let subscriptionState = openContractSubscriptions.get(ws);

    if (!subscriptionState) {
      subscriptionState = {
        count: 0,
        active: false,
        subscribing: false,
      };

      openContractSubscriptions.set(ws, subscriptionState);
    }

    subscriptionState.count += 1;

    const unsubscribeListener = ws.onMessage((data) => {
      if (data.msg_type !== 'proposal_open_contract') return;
      if (data.error) return;

      const contract = data.proposal_open_contract as OpenPosition | undefined;
      if (!contract) return;

      const isClosed =
        Boolean(contract.is_sold) ||
        Boolean(contract.is_expired) ||
        contract.status !== 'open';

      setPositions((prev) => {
        const map = new Map(prev.map((p) => [p.contract_id, p]));
        map.set(contract.contract_id, contract);
        return Array.from(map.values());
      });

      if (isClosed) {
        scheduleRemoval(contract.contract_id);
      }
    });

    if (!subscriptionState.active && !subscriptionState.subscribing) {
      subscriptionState.subscribing = true;

      ws.send({ proposal_open_contract: 1, subscribe: 1 })
        .then(() => {
          const latest = openContractSubscriptions.get(ws);

          if (latest) {
            latest.active = true;
            latest.subscribing = false;
          }
        })
        .catch((error) => {
          const latest = openContractSubscriptions.get(ws);

          if (latest) {
            latest.subscribing = false;

            if (isAlreadySubscribedError(error)) {
              latest.active = true;
            }
          }
        });
    }

    return () => {
      unsubscribeListener();

      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();

      setPositions([]);

      const latest = openContractSubscriptions.get(ws);

      if (!latest) return;

      latest.count -= 1;

      if (latest.count <= 0) {
  latest.count = 0;
}
    };
  }, [ws, isConnected, isAuthenticated, scheduleRemoval]);

  return { positions };
}
