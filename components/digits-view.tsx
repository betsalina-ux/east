'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/custom/footer';
import { Header } from '@/components/custom/header';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrentTickDisplay } from './current-tick-display';
import { DigitStatsBar } from './digit-stats-bar';
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

const RiseFallChart = dynamic(() => import('./rise-fall-chart').then(m => m.RiseFallChart), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-md border border-border/50 bg-muted/30" />
  ),
});

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

  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];

  logoSrc?: string;
  appName?: string;
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
  symbols,
  activeSymbol,
  selectSymbol,
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
  chartData,
  getQuotes,
  subscribeQuotes,
  unsubscribeQuotes,
  logoSrc,
  appName,
}: DigitsViewProps) {
  const [isStrategyPanelOpen, setIsStrategyPanelOpen] = useState(false);

  if (error) {
    return (
      <main className="flex flex-col bg-background items-center justify-center px-4 min-h-dvh">
        <Card className="max-w-md w-full">
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

      <div className={authState === 'authenticated' ? 'h-[122px] shrink-0 sm:h-[76px]' : 'h-[112px] shrink-0 sm:h-[66px]'} />

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
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${isStrategyPanelOpen ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
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

            <Card className="relative z-10 shrink-0 overflow-visible border shadow-sm mb-12">
              <CardContent className="flex flex-col overflow-visible p-3 pt-3 sm:p-6 sm:pt-4 pb-2 sm:pb-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px_360px]">
                  <div className="relative z-50 flex flex-col gap-3 min-w-0 pb-4 pt-1 sm:pb-6 sm:pt-2 lg:py-0">

  <div className="h-[420px] min-h-[420px]">
                      {chartData && activeSymbol?.underlying_symbol ? (
                        <RiseFallChart
                          symbolKey={`digits-chart-${activeSymbol.underlying_symbol}`}
                          symbol={activeSymbol.underlying_symbol}
                          isConnectionOpened={isConnected}
                          isMobile={false}
                          chartData={chartData}
                          getQuotes={getQuotes}
                          subscribeQuotes={subscribeQuotes}
                          unsubscribeQuotes={unsubscribeQuotes}
                          onSymbolChange={selectSymbol}
                          isLive
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center rounded-md border border-border/50 bg-muted/30">
                          <div className="text-sm text-muted-foreground">Loading chart...</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="contents">
                    <div className="relative z-10 py-4 sm:py-6 lg:py-0 lg:px-6 lg:border-l lg:border-border">
                      <CurrentTickDisplay
                        tick={currentTick}
                        lastDigit={lastDigit}
                        activeSymbol={activeSymbol}
                        pipSize={pipSize}
                      />

                      <DigitStatsBar
                        digitStats={digitStats}
                        selectedDigit={selectedDigit}
                        onDigitSelect={setSelectedDigit}
                      />
                    </div>

                    <div className="relative z-10 pt-4 sm:pt-6 lg:pt-0 lg:pl-6 lg:border-l lg:border-border">
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
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 py-2 text-center bg-background/80 backdrop-blur-sm">
        <Footer />
      </div>
    </main>
  );
}
