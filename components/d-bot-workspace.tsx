'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBuy } from '@deriv/core';
import type { DerivWS, ActiveSymbol, ProposalParams } from '@deriv/core';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useSmartChartsApi } from '@/hooks/use-smartcharts-api';
import { useSmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import { useRiseFallTrading } from '@/hooks/use-rise-fall-trading';
import { useDigitsTrading } from '@/hooks/use-digits-trading';
import { useContractMarkers } from '@/hooks/use-contract-markers';
import { SymbolSelector } from '@/components/custom/symbol-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const RiseFallChart = dynamic(
  () => import('@/components/rise-fall-chart').then((mod) => mod.RiseFallChart),
  { ssr: false }
);

type BotType = 'normal' | 'martingale';
type BotMarket = 'rise-fall' | 'even-odd' | 'matches-differs' | 'over-under';
type BotContract =
  | 'CALL'
  | 'PUT'
  | 'DIGITEVEN'
  | 'DIGITODD'
  | 'DIGITMATCH'
  | 'DIGITDIFF'
  | 'DIGITOVER'
  | 'DIGITUNDER';

interface DBotWorkspaceProps {
  ws: DerivWS | null;
  isConnected: boolean;
  isExhausted: boolean;
  isAuthorized: boolean;
  onAuthWSFailed: () => void;
}

interface BotStats {
  trades: number;
  wins: number;
  losses: number;
  profit: number;
}

function getMarketLabel(market: BotMarket) {
  switch (market) {
    case 'rise-fall':
      return 'Rise/Fall';
    case 'even-odd':
      return 'Even/Odd';
    case 'matches-differs':
      return 'Matches/Differs';
    case 'over-under':
      return 'Over/Under';
  }
}

function getContractOptions(market: BotMarket): { label: string; value: BotContract }[] {
  switch (market) {
    case 'rise-fall':
      return [
        { label: 'Rise', value: 'CALL' },
        { label: 'Fall', value: 'PUT' },
      ];
    case 'even-odd':
      return [
        { label: 'Even', value: 'DIGITEVEN' },
        { label: 'Odd', value: 'DIGITODD' },
      ];
    case 'matches-differs':
      return [
        { label: 'Matches', value: 'DIGITMATCH' },
        { label: 'Differs', value: 'DIGITDIFF' },
      ];
    case 'over-under':
      return [
        { label: 'Over', value: 'DIGITOVER' },
        { label: 'Under', value: 'DIGITUNDER' },
      ];
  }
}

function getDefaultContract(market: BotMarket): BotContract {
  return getContractOptions(market)[0].value;
}

function findSymbolName(symbol: ActiveSymbol | null) {
  if (!symbol) return 'Loading market...';
  return symbol.underlying_symbol_name || symbol.underlying_symbol;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function DBotWorkspace({
  ws,
  isConnected,
  isExhausted,
  isAuthorized,
  onAuthWSFailed,
}: DBotWorkspaceProps) {
  const isMobile = useIsMobile();

  const [botType, setBotType] = useState<BotType>('martingale');
  const [botMarket, setBotMarket] = useState<BotMarket>('rise-fall');
  const [botContract, setBotContract] = useState<BotContract>('CALL');

  const [stake, setStake] = useState('1');
  const [duration, setDuration] = useState('1');
  const [multiplier, setMultiplier] = useState('2');
  const [maxStake, setMaxStake] = useState('50');
  const [profitTarget, setProfitTarget] = useState('5');
  const [lossLimit, setLossLimit] = useState('2');
  const [selectedDigit, setSelectedDigit] = useState('5');

  const [currentStake, setCurrentStake] = useState(1);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botMessage, setBotMessage] = useState('');
  const [stats, setStats] = useState<BotStats>({
    trades: 0,
    wins: 0,
    losses: 0,
    profit: 0,
  });

  const isBotRunningRef = useRef(false);
  const currentStakeRef = useRef(1);
  const pendingContractIdRef = useRef<number | null>(null);
  const processedContractsRef = useRef<Set<number>>(new Set());
  const nextTradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlacingTradeRef = useRef(false);

  const riseFall = useRiseFallTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated: isAuthorized,
    onAuthWSFailed,
  });

  const digits = useDigitsTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated: isAuthorized,
    onAuthWSFailed,
  });

  const isDigitsMarket = botMarket !== 'rise-fall';
  const activeTrading = isDigitsMarket ? digits : riseFall;

  const { chartData } = useSmartChartChartData(
    ws,
    activeTrading.isConnected,
    activeTrading.symbols
  );

  const { getQuotes, subscribeQuotes, unsubscribeQuotes } = useSmartChartsApi(ws);

  const {
    buyContractFromParams,
    isBuying,
    buyResult,
    buyError,
  } = useBuy(ws, isConnected);

  const contractMarkers = useContractMarkers(
    activeTrading.openPositions,
    activeTrading.activeSymbol?.underlying_symbol,
    isMobile
  );

  const contractOptions = useMemo(() => getContractOptions(botMarket), [botMarket]);

  useEffect(() => {
    isBotRunningRef.current = isBotRunning;
  }, [isBotRunning]);

  useEffect(() => {
    currentStakeRef.current = currentStake;
  }, [currentStake]);

  useEffect(() => {
    const initialStake = Number(stake);
    if (Number.isFinite(initialStake) && initialStake > 0 && !isBotRunning) {
      setCurrentStake(initialStake);
      currentStakeRef.current = initialStake;
    }
  }, [stake, isBotRunning]);

  useEffect(() => {
    return () => {
      if (nextTradeTimerRef.current) clearTimeout(nextTradeTimerRef.current);
    };
  }, []);

  function handleMarketChange(value: BotMarket) {
    setBotMarket(value);
    setBotContract(getDefaultContract(value));
    handleStopBot();

    if (value === 'rise-fall') {
      riseFall.setContractType('rise-fall');
      riseFall.setDirection('CALL');
    }

    if (value === 'even-odd') {
      digits.setTradeType('even-odd');
      digits.setContractMode('DIGITEVEN');
    }

    if (value === 'matches-differs') {
      digits.setTradeType('matches-differs');
      digits.setContractMode('DIGITMATCH');
    }

    if (value === 'over-under') {
      digits.setTradeType('over-under');
      digits.setContractMode('DIGITOVER');
    }
  }

  const buildBotParams = useCallback((): ProposalParams | null => {
    if (!activeTrading.activeSymbol?.underlying_symbol) return null;

    const amount = Number(currentStakeRef.current);
    const ticks = Number(duration);

    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (!Number.isFinite(ticks) || ticks <= 0) return null;

    const needsDigitBarrier =
      botContract === 'DIGITMATCH' ||
      botContract === 'DIGITDIFF' ||
      botContract === 'DIGITOVER' ||
      botContract === 'DIGITUNDER';

    const digitValue = Number(selectedDigit);

    if (needsDigitBarrier && (!Number.isFinite(digitValue) || digitValue < 0 || digitValue > 9)) {
      return null;
    }

    return {
      contractType: botContract,
      symbol: activeTrading.activeSymbol.underlying_symbol,
      amount,
      duration: ticks,
      durationUnit: 't',
      basis: 'stake',
      currency: 'USD',
      ...(needsDigitBarrier ? { barrier: digitValue } : {}),
    };
  }, [activeTrading.activeSymbol?.underlying_symbol, botContract, duration, selectedDigit]);

  const placeNextTrade = useCallback(async () => {
    if (!isBotRunningRef.current) return;
    if (isPlacingTradeRef.current) return;
    if (pendingContractIdRef.current !== null) return;
    if (isBuying) return;

    if (!isAuthorized) {
      setBotMessage('Please login before starting the bot.');
      setIsBotRunning(false);
      return;
    }

    const params = buildBotParams();

    if (!params) {
      setBotMessage('Bot settings are not valid.');
      setIsBotRunning(false);
      return;
    }

    isPlacingTradeRef.current = true;
    setBotMessage('Placing trade...');

    try {
      await buyContractFromParams(params);
    } finally {
      isPlacingTradeRef.current = false;
    }
  }, [buildBotParams, buyContractFromParams, isAuthorized, isBuying]);

  useEffect(() => {
    if (!buyResult?.contractId) return;
    if (!isBotRunningRef.current) return;

    pendingContractIdRef.current = buyResult.contractId;
    setBotMessage(`Trade #${buyResult.contractId} placed. Waiting for result...`);

    setStats((prev) => ({
      ...prev,
      trades: prev.trades + 1,
    }));
  }, [buyResult?.contractId]);

  useEffect(() => {
    if (!buyError) return;
    setBotMessage(buyError);
    isPlacingTradeRef.current = false;
  }, [buyError]);

  useEffect(() => {
    const pendingId = pendingContractIdRef.current;
    if (!pendingId) return;

    const position = activeTrading.openPositions.find((item) => item.contract_id === pendingId);
    if (!position) return;

    const isClosed =
      Boolean(position.is_sold) ||
      Boolean(position.is_expired) ||
      position.status !== 'open';

    if (!isClosed) return;

    if (processedContractsRef.current.has(pendingId)) return;
    processedContractsRef.current.add(pendingId);
    pendingContractIdRef.current = null;

    const profit = Number(position.profit ?? 0);
    const isWin = profit > 0;
    const isLoss = profit < 0;

    const initialStake = Number(stake) || 1;
    const martingaleMultiplier = Number(multiplier) || 2;
    const maxStakeAmount = Number(maxStake) || 50;
    const targetProfit = Number(profitTarget) || 0;
    const maxLossAmount = Number(lossLimit) || 0;

    let shouldContinue = isBotRunningRef.current;
    let nextStake = currentStakeRef.current;

    setStats((prev) => {
      const nextProfit = roundMoney(prev.profit + profit);

      const nextStats = {
        trades: prev.trades,
        wins: prev.wins + (isWin ? 1 : 0),
        losses: prev.losses + (isLoss ? 1 : 0),
        profit: nextProfit,
      };

      if (targetProfit > 0 && nextProfit >= targetProfit) {
        shouldContinue = false;
        setBotMessage(`Profit target reached: $${nextProfit.toFixed(2)}.`);
      }

      if (maxLossAmount > 0 && nextProfit <= -Math.abs(maxLossAmount)) {
        shouldContinue = false;
        setBotMessage(`Loss limit reached: $${nextProfit.toFixed(2)}.`);
      }

      return nextStats;
    });

    if (botType === 'martingale') {
      if (isWin) {
        nextStake = initialStake;
      } else if (isLoss) {
        nextStake = roundMoney(currentStakeRef.current * martingaleMultiplier);
      }

      if (nextStake > maxStakeAmount) {
        nextStake = initialStake;
        shouldContinue = false;
        setBotMessage('Max stake reached. Bot stopped and stake reset.');
      }
    } else {
      nextStake = initialStake;
    }

    setCurrentStake(nextStake);
    currentStakeRef.current = nextStake;

    if (!shouldContinue) {
      setIsBotRunning(false);
      isBotRunningRef.current = false;
      return;
    }

    setBotMessage(
      `${isWin ? 'Win' : isLoss ? 'Loss' : 'Break even'}: $${profit.toFixed(2)}. Next trade starting...`
    );

    if (nextTradeTimerRef.current) clearTimeout(nextTradeTimerRef.current);

    nextTradeTimerRef.current = setTimeout(() => {
      placeNextTrade();
    }, 700);
  }, [
    activeTrading.openPositions,
    botType,
    lossLimit,
    maxStake,
    multiplier,
    placeNextTrade,
    profitTarget,
    stake,
  ]);

  function handleStartBot() {
    setBotMessage('');
    processedContractsRef.current.clear();
    pendingContractIdRef.current = null;

    const initialStake = Number(stake) || 1;
    setCurrentStake(initialStake);
    currentStakeRef.current = initialStake;

    setStats({
      trades: 0,
      wins: 0,
      losses: 0,
      profit: 0,
    });

    setIsBotRunning(true);
    isBotRunningRef.current = true;

    setTimeout(() => {
      placeNextTrade();
    }, 100);
  }

  function handleStopBot() {
    setIsBotRunning(false);
    isBotRunningRef.current = false;
    pendingContractIdRef.current = null;
    isPlacingTradeRef.current = false;

    if (nextTradeTimerRef.current) {
      clearTimeout(nextTradeTimerRef.current);
      nextTradeTimerRef.current = null;
    }

    setBotMessage('Bot stopped.');
  }

  const winRate = stats.trades > 0 ? Math.round((stats.wins / stats.trades) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 pb-28 pt-3 sm:gap-4 sm:px-4 sm:pt-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">D BOT</h1>
            <p className="text-sm text-muted-foreground">
              Chart, market selector, and bot manager.
            </p>
          </div>

          <div className="rounded-full border px-3 py-1 text-xs font-bold">
            {isBotRunning ? 'BOT RUNNING' : 'BOT OFF'}
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Market type</Label>
            <Select value={botMarket} onValueChange={(value) => handleMarketChange(value as BotMarket)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rise-fall">Rise/Fall</SelectItem>
                <SelectItem value="even-odd">Even/Odd</SelectItem>
                <SelectItem value="matches-differs">Matches/Differs</SelectItem>
                <SelectItem value="over-under">Over/Under</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Symbol</Label>
            <SymbolSelector
              symbols={activeTrading.symbols}
              activeSymbol={activeTrading.activeSymbol}
              onSymbolChange={activeTrading.selectSymbol}
            />
          </div>

          <div className="space-y-2">
            <Label>Bot type</Label>
            <Select value={botType} onValueChange={(value) => setBotType(value as BotType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="martingale">Martingale Bot</SelectItem>
                <SelectItem value="normal">Normal Bot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Contract</Label>
            <Select value={botContract} onValueChange={(value) => setBotContract(value as BotContract)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contractOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-[42dvh] min-h-[260px] overflow-hidden rounded-xl border bg-background sm:min-h-[340px] lg:h-[min(33.6rem,66vh)] lg:min-h-[384px]">
          {chartData && activeTrading.activeSymbol?.underlying_symbol ? (
            <RiseFallChart
              symbolKey={`d-bot-chart-${activeTrading.activeSymbol.underlying_symbol}`}
              symbol={activeTrading.activeSymbol.underlying_symbol}
              isConnectionOpened={activeTrading.isConnected}
              isMobile={isMobile}
              chartData={chartData}
              getQuotes={getQuotes}
              subscribeQuotes={subscribeQuotes}
              unsubscribeQuotes={unsubscribeQuotes}
              onSymbolChange={activeTrading.selectSymbol}
              contractsArray={contractMarkers}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading chart...
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Bot Settings</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Initial stake</Label>
              <Input value={stake} onChange={(event) => setStake(event.target.value)} disabled={isBotRunning} />
            </div>

            <div className="space-y-2">
              <Label>Duration ticks</Label>
              <Input value={duration} onChange={(event) => setDuration(event.target.value)} disabled={isBotRunning} />
            </div>

            {isDigitsMarket && (
              <div className="space-y-2">
                <Label>Digit prediction</Label>
                <Input
                  type="number"
                  min={0}
                  max={9}
                  value={selectedDigit}
                  onChange={(event) => setSelectedDigit(event.target.value)}
                  disabled={isBotRunning}
                />
              </div>
            )}

            {botType === 'martingale' && (
              <>
                <div className="space-y-2">
                  <Label>Multiplier</Label>
                  <Input value={multiplier} onChange={(event) => setMultiplier(event.target.value)} disabled={isBotRunning} />
                </div>

                <div className="space-y-2">
                  <Label>Max stake</Label>
                  <Input value={maxStake} onChange={(event) => setMaxStake(event.target.value)} disabled={isBotRunning} />
                </div>

                <div className="space-y-2">
                  <Label>Profit target</Label>
                  <Input value={profitTarget} onChange={(event) => setProfitTarget(event.target.value)} disabled={isBotRunning} />
                </div>

                <div className="space-y-2">
                  <Label>Loss limit</Label>
                  <Input value={lossLimit} onChange={(event) => setLossLimit(event.target.value)} disabled={isBotRunning} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Control</h2>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" onClick={handleStartBot} disabled={isBotRunning || isBuying}>
              {isBuying ? 'BUYING...' : 'START'}
            </Button>

            <Button type="button" variant="destructive" onClick={handleStopBot} disabled={!isBotRunning}>
              STOP
            </Button>
          </div>

          <div className="mt-4 rounded-xl border bg-background p-3 text-sm">
            <p className="text-muted-foreground">Current status</p>
            <p className="font-bold">{isBotRunning ? 'Bot is running' : 'Bot is stopped'}</p>
          </div>

          {(botMessage || buyError) && (
            <div className="mt-3 rounded-xl border bg-background p-3 text-sm">
              <p className="text-muted-foreground">Message</p>
              <p className="font-medium">{buyError || botMessage}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Bot Statistics</h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Trades taken</p>
            <p className="font-bold">{stats.trades}</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Wins</p>
            <p className="font-bold">{stats.wins}</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Losses</p>
            <p className="font-bold">{stats.losses}</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Win rate</p>
            <p className="font-bold">{winRate}%</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Profit</p>
            <p className="font-bold">${stats.profit.toFixed(2)}</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Current stake</p>
            <p className="font-bold">${currentStake.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Selected market</p>
            <p className="font-bold">{getMarketLabel(botMarket)} — {findSymbolName(activeTrading.activeSymbol)}</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Open trades</p>
            <p className="font-bold">{activeTrading.openPositions.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
