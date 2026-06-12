'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { DerivWS, ActiveSymbol } from '@deriv/core';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useSmartChartsApi } from '@/hooks/use-smartcharts-api';
import { useSmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import { useRiseFallTrading } from '@/hooks/use-rise-fall-trading';
import { useDigitsTrading } from '@/hooks/use-digits-trading';
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
  const [isBotRunning, setIsBotRunning] = useState(false);

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

  const contractOptions = useMemo(() => getContractOptions(botMarket), [botMarket]);

  function handleMarketChange(value: BotMarket) {
    setBotMarket(value);
    setBotContract(getDefaultContract(value));

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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-24 pt-4">
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

        <div className="mb-4 grid gap-4 md:grid-cols-4">
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

        <div className="h-[320px] overflow-hidden rounded-xl border bg-background sm:h-[420px]">
          {activeTrading.activeSymbol?.underlying_symbol ? (
            <RiseFallChart
              symbolKey={activeTrading.activeSymbol.underlying_symbol}
              symbol={activeTrading.activeSymbol.underlying_symbol}
              isConnectionOpened={activeTrading.isConnected}
              isMobile={isMobile}
              chartData={chartData}
              getQuotes={getQuotes}
              subscribeQuotes={subscribeQuotes}
              unsubscribeQuotes={unsubscribeQuotes}
              onSymbolChange={activeTrading.selectSymbol}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading chart...
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Bot Settings</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Stake</Label>
              <Input value={stake} onChange={(event) => setStake(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Duration ticks</Label>
              <Input value={duration} onChange={(event) => setDuration(event.target.value)} />
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
                />
              </div>
            )}

            {botType === 'martingale' && (
              <>
                <div className="space-y-2">
                  <Label>Multiplier</Label>
                  <Input value={multiplier} onChange={(event) => setMultiplier(event.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Max stake</Label>
                  <Input value={maxStake} onChange={(event) => setMaxStake(event.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Profit target</Label>
                  <Input value={profitTarget} onChange={(event) => setProfitTarget(event.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Loss limit</Label>
                  <Input value={lossLimit} onChange={(event) => setLossLimit(event.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Control</h2>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" onClick={() => setIsBotRunning(true)} disabled={isBotRunning}>
              START
            </Button>

            <Button type="button" variant="destructive" onClick={() => setIsBotRunning(false)} disabled={!isBotRunning}>
              STOP
            </Button>
          </div>

          <div className="mt-4 rounded-xl border bg-background p-3 text-sm">
            <p className="text-muted-foreground">Current status</p>
            <p className="font-bold">{isBotRunning ? 'Bot is running' : 'Bot is stopped'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Bot Statistics</h2>

        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Selected market</p>
            <p className="font-bold">{getMarketLabel(botMarket)}</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Symbol</p>
            <p className="font-bold">{findSymbolName(activeTrading.activeSymbol)}</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Trades</p>
            <p className="font-bold">0</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Wins / Losses</p>
            <p className="font-bold">0 / 0</p>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <p className="text-muted-foreground">Profit</p>
            <p className="font-bold">$0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}
