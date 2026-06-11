'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useActiveSymbols, useBuy } from '@deriv/core';
import type { ActiveSymbol, BuyResult, DerivWS, ProposalParams } from '@deriv/core';
import { Button } from '@/components/ui/button';

type BotType = 'martingale' | 'normal';
type ContractSide = 'CALL' | 'PUT';
type BotStatus = 'idle' | 'running' | 'waiting' | 'stopped';

interface DBotManagerProps {
  ws: DerivWS | null;
  isConnected: boolean;
  isAuthorized: boolean;
}

interface ProfitTableTransaction {
  contract_id: number;
  buy_price?: number | string | null;
  sell_price?: number | string | null;
  payout?: number | string | null;
  profit?: number | string | null;
  transaction_id?: number;
}

interface ProfitTableResponse {
  profit_table?: {
    transactions?: ProfitTableTransaction[];
  };
}

function toMoney(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

function safeNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getDefaultSymbol(botType: BotType) {
  return botType === 'martingale' ? '1HZ100V' : 'R_25';
}

export function DBotManager({ ws, isConnected, isAuthorized }: DBotManagerProps) {
  const [botType, setBotType] = useState<BotType>('martingale');
  const [contractSide, setContractSide] = useState<ContractSide>('CALL');
  const [symbol, setSymbol] = useState('1HZ100V');
  const [stake, setStake] = useState('1');
  const [duration, setDuration] = useState('1');
  const [multiplier, setMultiplier] = useState('2');
  const [maxStake, setMaxStake] = useState('50');
  const [profitTarget, setProfitTarget] = useState('5');
  const [lossLimit, setLossLimit] = useState('2');

  const [status, setStatus] = useState<BotStatus>('idle');
  const [message, setMessage] = useState('Choose a bot and press START BOT.');
  const [currentStake, setCurrentStake] = useState(1);
  const [totalProfit, setTotalProfit] = useState(0);
  const [trades, setTrades] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  const runningRef = useRef(false);
  const currentStakeRef = useRef(1);
  const totalProfitRef = useRef(0);
  const lastContractIdRef = useRef<number | null>(null);

  const { symbols } = useActiveSymbols(ws, isConnected, ['CALL', 'PUT']);
  const { buyContractFromParams, isBuying, buyResult, buyError, clearBuyResult } =
    useBuy(ws, isConnected);

  const selectedSymbol = useMemo(
    () => symbols.find(item => item.underlying_symbol === symbol),
    [symbols, symbol]
  );

  const symbolOptions = useMemo(() => {
    const synthetic = symbols.filter(item => item.market === 'synthetic_index');
    return synthetic.length ? synthetic : symbols;
  }, [symbols]);

  useEffect(() => {
    const nextDefault = getDefaultSymbol(botType);
    setSymbol(nextDefault);

    if (botType === 'martingale') {
      setDuration('1');
      setStake('1');
      setMultiplier('2');
      setMaxStake('50');
      setProfitTarget('5');
      setLossLimit('2');
    } else {
      setDuration('2');
      setStake('1');
    }
  }, [botType]);

  useEffect(() => {
    const firstStake = Math.max(safeNumber(stake, 1), 0.35);
    currentStakeRef.current = firstStake;
    setCurrentStake(firstStake);
  }, [stake]);

  const buildTradeParams = useCallback(
    (amount: number): ProposalParams | null => {
      const durationNumber = Math.max(Math.floor(safeNumber(duration, 1)), 1);
      const activeSymbol = selectedSymbol?.underlying_symbol ?? symbol;

      if (!activeSymbol || !Number.isFinite(amount) || amount <= 0) return null;

      return {
        contractType: contractSide,
        symbol: activeSymbol,
        amount,
        basis: 'stake',
        currency: 'USD',
        duration: durationNumber,
        durationUnit: 't',
      };
    },
    [contractSide, duration, selectedSymbol?.underlying_symbol, symbol]
  );

  const fetchClosedResult = useCallback(
    async (contractId: number): Promise<number | null> => {
      if (!ws || !isConnected || !isAuthorized) return null;

      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 700));

        try {
          const response = await ws.send<ProfitTableResponse>({
            profit_table: 1,
            description: 1,
            sort: 'DESC',
            limit: 20,
          });

          const transaction = response.profit_table?.transactions?.find(
            item => Number(item.contract_id) === contractId
          );

          if (transaction) {
            if (transaction.profit !== undefined && transaction.profit !== null) {
              return safeNumber(transaction.profit);
            }

            const sellPrice = safeNumber(transaction.sell_price);
            const buyPrice = safeNumber(transaction.buy_price);
            return sellPrice - buyPrice;
          }
        } catch {
          // Keep polling. Some contracts need a moment to appear in profit_table.
        }
      }

      return null;
    },
    [ws, isConnected, isAuthorized]
  );

  const placeNextTrade = useCallback(async () => {
    if (!runningRef.current) return;

    if (!isAuthorized) {
      setStatus('stopped');
      setMessage('Please login before starting the bot.');
      runningRef.current = false;
      return;
    }

    const params = buildTradeParams(currentStakeRef.current);

    if (!params) {
      setStatus('stopped');
      setMessage('Bot stopped: invalid trade settings.');
      runningRef.current = false;
      return;
    }

    setStatus('running');
    setMessage(`Buying ${params.contractType} on ${params.symbol} with stake ${params.amount}`);
    await buyContractFromParams(params);
  }, [buildTradeParams, buyContractFromParams, isAuthorized]);

  const handleClosedTrade = useCallback(
    async (result: BuyResult) => {
      if (!runningRef.current) return;
      if (lastContractIdRef.current === result.contractId) return;

      lastContractIdRef.current = result.contractId;
      setStatus('waiting');
      setMessage('Waiting for contract result...');

      const profit = await fetchClosedResult(result.contractId);

      if (profit === null) {
        setStatus('stopped');
        setMessage('Bot stopped: could not read the closed contract result.');
        runningRef.current = false;
        return;
      }

      const nextTotal = Number((totalProfitRef.current + profit).toFixed(2));
      const won = profit > 0;
      const firstStake = Math.max(safeNumber(stake, 1), 0.35);
      const martingaleMultiplier = Math.max(safeNumber(multiplier, 2), 1);
      const maxStakeNumber = Math.max(safeNumber(maxStake, 50), firstStake);
      const profitTargetNumber = Math.max(safeNumber(profitTarget, 5), 0);
      const lossLimitNumber = Math.max(safeNumber(lossLimit, 2), 0);

      totalProfitRef.current = nextTotal;
      setTotalProfit(nextTotal);
      setTrades(prev => prev + 1);
      setWins(prev => prev + (won ? 1 : 0));
      setLosses(prev => prev + (won ? 0 : 1));

      if (profitTargetNumber > 0 && nextTotal >= profitTargetNumber) {
        setStatus('stopped');
        setMessage(`Profit target reached: ${toMoney(nextTotal)}. Bot stopped.`);
        runningRef.current = false;
        return;
      }

      if (lossLimitNumber > 0 && nextTotal <= -lossLimitNumber) {
        setStatus('stopped');
        setMessage(`Loss limit reached: ${toMoney(nextTotal)}. Bot stopped.`);
        runningRef.current = false;
        return;
      }

      if (botType === 'martingale') {
        if (won) {
          currentStakeRef.current = firstStake;
        } else {
          const nextStake = Number((currentStakeRef.current * martingaleMultiplier).toFixed(2));
          currentStakeRef.current = nextStake > maxStakeNumber ? firstStake : nextStake;
        }
      } else {
        currentStakeRef.current = firstStake;
      }

      setCurrentStake(currentStakeRef.current);
      setMessage(
        `${won ? 'Win' : 'Loss'}: ${toMoney(profit)}. Next stake: ${currentStakeRef.current}`
      );

      window.setTimeout(() => {
        void placeNextTrade();
      }, 900);
    },
    [botType, fetchClosedResult, lossLimit, maxStake, multiplier, placeNextTrade, profitTarget, stake]
  );

  useEffect(() => {
    if (buyResult) {
      void handleClosedTrade(buyResult);
    }
  }, [buyResult, handleClosedTrade]);

  useEffect(() => {
    if (buyError) {
      setStatus('stopped');
      setMessage(`Bot stopped: ${buyError}`);
      runningRef.current = false;
    }
  }, [buyError]);

  const startBot = useCallback(() => {
    clearBuyResult();
    const firstStake = Math.max(safeNumber(stake, 1), 0.35);

    runningRef.current = true;
    lastContractIdRef.current = null;
    currentStakeRef.current = firstStake;
    totalProfitRef.current = 0;

    setCurrentStake(firstStake);
    setTotalProfit(0);
    setTrades(0);
    setWins(0);
    setLosses(0);
    setStatus('running');
    setMessage('Bot started. Preparing first trade...');

    void placeNextTrade();
  }, [clearBuyResult, placeNextTrade, stake]);

  const stopBot = useCallback(() => {
    runningRef.current = false;
    setStatus('stopped');
    setMessage('Bot stopped manually.');
  }, []);

  const isRunning = status === 'running' || status === 'waiting' || isBuying;

  return (
    <div className="w-full max-w-5xl rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">D BOT</h1>
          <p className="text-sm text-muted-foreground">
            Bot Manager for Martingale, Normal, and future strategy bots.
          </p>
        </div>
        <div className="rounded-full border px-4 py-2 text-sm font-bold uppercase">
          {status}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border bg-background p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Bot Type
              <select
                className="w-full rounded-lg border bg-background p-3"
                value={botType}
                disabled={isRunning}
                onChange={event => setBotType(event.target.value as BotType)}
              >
                <option value="martingale">Martingale</option>
                <option value="normal">Normal</option>
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium">
              Market
              <select
                className="w-full rounded-lg border bg-background p-3"
                value={symbol}
                disabled={isRunning}
                onChange={event => setSymbol(event.target.value)}
              >
                {symbolOptions.map((item: ActiveSymbol) => (
                  <option key={item.underlying_symbol} value={item.underlying_symbol}>
                    {item.underlying_symbol_name} ({item.underlying_symbol})
                  </option>
                ))}
                {!symbolOptions.length && <option value={symbol}>{symbol}</option>}
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium">
              Contract
              <select
                className="w-full rounded-lg border bg-background p-3"
                value={contractSide}
                disabled={isRunning}
                onChange={event => setContractSide(event.target.value as ContractSide)}
              >
                <option value="CALL">CALL / Rise</option>
                <option value="PUT">PUT / Fall</option>
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium">
              Duration / Ticks
              <input
                className="w-full rounded-lg border bg-background p-3"
                type="number"
                min="1"
                value={duration}
                disabled={isRunning}
                onChange={event => setDuration(event.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm font-medium">
              Stake
              <input
                className="w-full rounded-lg border bg-background p-3"
                type="number"
                min="0.35"
                step="0.01"
                value={stake}
                disabled={isRunning}
                onChange={event => setStake(event.target.value)}
              />
            </label>

            {botType === 'martingale' && (
              <>
                <label className="space-y-1 text-sm font-medium">
                  Multiplier
                  <input
                    className="w-full rounded-lg border bg-background p-3"
                    type="number"
                    min="1"
                    step="0.1"
                    value={multiplier}
                    disabled={isRunning}
                    onChange={event => setMultiplier(event.target.value)}
                  />
                </label>

                <label className="space-y-1 text-sm font-medium">
                  Max Stake
                  <input
                    className="w-full rounded-lg border bg-background p-3"
                    type="number"
                    min="0.35"
                    step="0.01"
                    value={maxStake}
                    disabled={isRunning}
                    onChange={event => setMaxStake(event.target.value)}
                  />
                </label>

                <label className="space-y-1 text-sm font-medium">
                  Profit Target
                  <input
                    className="w-full rounded-lg border bg-background p-3"
                    type="number"
                    min="0"
                    step="0.01"
                    value={profitTarget}
                    disabled={isRunning}
                    onChange={event => setProfitTarget(event.target.value)}
                  />
                </label>

                <label className="space-y-1 text-sm font-medium">
                  Loss Limit
                  <input
                    className="w-full rounded-lg border bg-background p-3"
                    type="number"
                    min="0"
                    step="0.01"
                    value={lossLimit}
                    disabled={isRunning}
                    onChange={event => setLossLimit(event.target.value)}
                  />
                </label>
              </>
            )}
          </div>

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <Button
              type="button"
              className="h-12 rounded-xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
              disabled={!isAuthorized || !isConnected || isRunning}
              onClick={startBot}
            >
              START BOT
            </Button>

            <Button
              type="button"
              variant="destructive"
              className="h-12 rounded-xl text-base font-bold"
              disabled={!isRunning}
              onClick={stopBot}
            >
              STOP BOT
            </Button>
          </div>

          {!isAuthorized && (
            <p className="rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700 dark:bg-orange-950/30 dark:text-orange-200">
              Login to your Deriv account before starting the bot.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border bg-background p-4">
          <h2 className="text-lg font-bold">Live Bot Stats</h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border p-3">
              <div className="text-muted-foreground">Total Profit</div>
              <div className="text-xl font-bold">{toMoney(totalProfit)}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-muted-foreground">Current Stake</div>
              <div className="text-xl font-bold">{currentStake.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-muted-foreground">Trades</div>
              <div className="text-xl font-bold">{trades}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-muted-foreground">Wins / Losses</div>
              <div className="text-xl font-bold">{wins} / {losses}</div>
            </div>
          </div>

          <div className="rounded-xl border p-3 text-sm">
            <div className="font-bold">Bot Message</div>
            <p className="mt-1 text-muted-foreground">{message}</p>
          </div>

          <div className="rounded-xl border p-3 text-xs text-muted-foreground">
            Normal bot repeats the same stake. Martingale resets after a win and multiplies after a loss.
          </div>
        </div>
      </div>
    </div>
  );
}
