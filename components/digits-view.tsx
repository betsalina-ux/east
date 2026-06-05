'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/custom/footer';
import { Header } from '@/components/custom/header';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrentTickDisplay } from './current-tick-display';
import { TradeControls } from './digits-trade-controls';
import { TradeTypeChips } from '@/components/custom/trade-type-chips';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { StrategyPanel } from '@/components/strategy-panel';
import type {
  AuthState,
  DerivAccount,
  ActiveSymbol,
  Tick,
  ProposalInfo,
  DurationLimits,
  BuyResult,
} from '@deriv/core';
import type { ContractMode, TradeType, DigitStats } from '../lib/types';
import type { UseSmartChartsApiReturn } from '@/hooks/use-smartcharts-api';
import type { SmartChartChartData } from '@/hooks/use-smartchart-chart-data';

const DIGIT_TRADE_TYPE_OPTIONS: { value: TradeType; label: string }[] = [
  { value: 'matches-differs', label: 'Matches/Differs' },
  { value: 'over-under', label: 'Over/Under' },
  { value: 'even-odd', label: 'Even/Odd' },
];

export interface DigitsViewProps {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onSignUp: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;

  isConnected: boolean;
  isAuthorized?: boolean;
  isLoading: boolean;
  error: string | null;

  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  lastDigit: number | null;
  digitStats: DigitStats;
  pipSize: number;

  tradeType: TradeType;
  setTradeType: (type: TradeType) => void;
  contractMode: ContractMode;
  setContractMode: (mode: ContractMode) => void;
  selectedDigit: number;
  setSelectedDigit: (digit: number) => void;
  stake: string;
  setStake: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  durationLimits: DurationLimits;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  buyContract: (mode?: ContractMode) => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;

  // Kept so app/page.tsx can continue passing chart props without breaking.
  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];

  logoSrc?: string;
  appName?: string;
}

function formatPercent(value: number | undefined): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${Number(value).toFixed(1)}%`;
}

function DigitPredictionBoard({
  digitStats,
  selectedDigit,
  setSelectedDigit,
  lastDigit,
}: {
  digitStats: DigitStats;
  selectedDigit: number;
  setSelectedDigit: (digit: number) => void;
  lastDigit: number | null;
}) {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Last digit prediction</p>
          <p className="text-xs text-muted-foreground">
            Percentages from recent live ticks
          </p>
        </div>

        <div className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
          Total ticks: {digitStats.totalTicks ?? 0}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {digits.map(digit => {
          const isSelected = selectedDigit === digit;
          const isLive = lastDigit === digit;

          return (
            <button
              key={digit}
              type="button"
              onClick={() => setSelectedDigit(digit)}
              className={`relative min-h-[78px] rounded-xl border p-2 text-center transition sm:min-h-[92px] ${
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-border bg-background hover:bg-muted/60'
              }`}
            >
              {isLive && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg leading-none text-primary">
                  ▲
                </div>
              )}

              <div
                className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-lg font-black sm:h-11 sm:w-11 sm:text-xl ${
                  isLive
                    ? 'bg-primary text-primary-foreground'
                    : isSelected
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-foreground'
                }`}
              >
                {digit}
              </div>

              <div className="mt-2 text-xs font-bold text-muted-foreground sm:text-sm">
                {formatPercent(digitStats.percentages?.[digit])}
              </div>

              {isLive && (
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                  Live
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DigitsView({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onSignUp,
  onLogout,
  onSwitchAccount,
  isConnected,
  isAuthorized,
  isLoading,
  error,
  activeSymbol,
  currentTick,
  lastDigit,
  digitStats,
  pipSize,
  tradeType,
  setTradeType,
  contractMode,
  setContractMode,
  selectedDigit,
  setSelectedDigit,
  stake,
  setStake,
  duration,
  setDuration,
  durationLimits,
  proposal,
  isProposalLoading,
  buyContract,
  isBuying,
  buyResult,
  buyError,
  clearBuyResult,
  logoSrc,
  appName,
}: DigitsViewProps) {
  const [isStrategyPanelOpen, setIsStrategyPanelOpen] = useState(false);

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-background max-lg:h-dvh max-lg:overflow-y-auto lg:overflow-visible">
      <Header
        authState={authState}
        accounts={accounts}
        activeAccount={activeAccount}
        onLogin={onLogin}
        onSignUp={onSignUp}
        onLogout={onLogout}
        onSwitchAccount={onSwitchAccount}
        logoSrc={logoSrc}
        appName={appName}
        actions={<ThemeToggle />}
      />

      <div
        className={
          authState === 'authenticated'
            ? 'h-[122px] shrink-0 sm:h-[76px]'
            : 'h-[112px] shrink-0 sm:h-[66px]'
        }
      />

      <div className="flex w-full max-w-7xl mx-auto flex-col px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 lg:flex-none lg:overflow-visible pb-10">
        {isLoading ? (
          <>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <Skeleton className="w-full h-[420px] rounded-xl" />
          </>
        ) : (
          <>
            <div className="shrink-0 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <TradeTypeChips
                value={tradeType}
                options={DIGIT_TRADE_TYPE_OPTIONS}
                onValueChange={setTradeType}
              />
            </div>

            <div className="shrink-0 rounded-2xl border border-border bg-card shadow-sm lg:max-w-[calc(100%-420px)]">
              <button
                type="button"
                onClick={() => setIsStrategyPanelOpen(value => !value)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-bold">Strategy Panel</p>
                  <p className="text-xs text-muted-foreground">
                    {isStrategyPanelOpen ? 'ON — signals visible' : 'OFF — tap to open'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isStrategyPanelOpen
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isStrategyPanelOpen ? 'ON' : 'OFF'}
                </span>
              </button>

              {isStrategyPanelOpen && (
                <div className="max-h-[24dvh] overflow-y-auto border-t border-border px-4 py-3">
                  <StrategyPanel
                    latestPrice={currentTick?.quote ?? null}
                    pipSize={pipSize}
                    symbol={activeSymbol?.underlying_symbol}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="flex min-w-0 flex-col gap-3">
                <Card className="shrink-0 border shadow-sm">
                  <CardContent className="p-3 sm:p-5">
                    <CurrentTickDisplay
                      tick={currentTick}
                      lastDigit={lastDigit}
                      activeSymbol={activeSymbol}
                      pipSize={pipSize}
                    />
                  </CardContent>
                </Card>

                <DigitPredictionBoard
                  digitStats={digitStats}
                  selectedDigit={selectedDigit}
                  setSelectedDigit={setSelectedDigit}
                  lastDigit={lastDigit}
                />
              </div>

              <Card className="shrink-0 border shadow-sm mb-12 lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] lg:overflow-y-auto">
                <CardContent className="pt-4 pb-32">
                  <TradeControls
                    tradeType={tradeType}
                    contractMode={contractMode}
                    onContractModeChange={setContractMode}
                    selectedDigit={selectedDigit}
                    isConnected={isConnected}
                    stake={stake}
                    onStakeChange={setStake}
                    duration={duration}
                    onDurationChange={setDuration}
                    durationLimits={durationLimits}
                    proposal={proposal}
                    isProposalLoading={isProposalLoading}
                    onBuy={buyContract}
                    isBuying={isBuying}
                    buyResult={buyResult}
                    buyError={buyError}
                    onClearBuyResult={clearBuyResult}
                    isAuthenticated={authState === 'authenticated' && !!isAuthorized}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 py-2 text-center bg-background/80 backdrop-blur-sm">
        <Footer />
      </div>
    </main>
  );
}
