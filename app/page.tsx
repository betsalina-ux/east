'use client';

import { useEffect, useState } from 'react';
import { useSmartChartsApi } from '@/hooks/use-smartcharts-api';
import { useSmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import { useRiseFallTrading } from '@/hooks/use-rise-fall-trading';
import { useDigitsTrading } from '@/hooks/use-digits-trading';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { RiseFallView } from '@/components/rise-fall-view';
import { DigitsView } from '@/components/digits-view';
import { DBotWorkspace } from '@/components/d-bot-workspace';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Footer } from '@/components/custom/footer';

type TemplateKey = 'up-down' | 'digits' | 'd-bot';

function TemplateTabs({
  active,
  onChange,
}: {
  active: TemplateKey;
  onChange: (value: TemplateKey) => void;
}) {
  return (
    <div className="fixed left-4 top-[72px] z-40 flex gap-2 rounded-full border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur sm:left-1/2 sm:top-2 sm:z-[60] sm:-translate-x-1/2">
      <Button
        type="button"
        size="sm"
        variant={active === 'up-down' ? 'default' : 'ghost'}
        className="rounded-full px-4 font-bold"
        onClick={() => onChange('up-down')}
      >
        Up/Down
      </Button>

      <Button
        type="button"
        size="sm"
        variant={active === 'digits' ? 'default' : 'ghost'}
        className="rounded-full px-4 font-bold"
        onClick={() => onChange('digits')}
      >
        Digits Market
      </Button>

      <Button
        type="button"
        size="sm"
        variant={active === 'd-bot' ? 'default' : 'ghost'}
        className="rounded-full px-4 font-bold"
        onClick={() => onChange('d-bot')}
      >
        D BOT
      </Button>
    </div>
  );
}

function RiseFallTemplate() {
  const { ws, isConnected, isExhausted, isAuthorized, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;

  const trading = useRiseFallTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated: isAuthorized,
    onAuthWSFailed: logout,
  });

  const { chartData } = useSmartChartChartData(
    trading.ws,
    trading.isConnected,
    trading.symbols
  );

  const { getQuotes, subscribeQuotes, unsubscribeQuotes } =
    useSmartChartsApi(trading.ws);

  return (
    <RiseFallView
      authState={authState}
      accounts={accounts}
      activeAccount={activeAccount}
      currentTick={trading.currentTick}
      prices={trading.prices}
      pipSize={trading.pipSize}
      onLogin={login}
      onSignUp={signUp}
      onLogout={logout}
      onSwitchAccount={switchAccount}
      logoSrc="/logo.png"
      ws={trading.ws}
      isConnected={trading.isConnected}
      isAuthorized={isAuthorized}
      isLoading={trading.isLoading}
      error={trading.error}
      activeSymbol={trading.activeSymbol}
      selectSymbol={trading.selectSymbol}
      contractType={trading.contractType}
      setContractType={trading.setContractType}
      direction={trading.direction}
      setDirection={trading.setDirection}
      allowEquals={trading.allowEquals}
      setAllowEquals={trading.setAllowEquals}
      barrier={trading.barrier}
      setBarrier={trading.setBarrier}
      stake={trading.stake}
      setStake={trading.setStake}
      duration={trading.duration}
      setDuration={trading.setDuration}
      durationOptions={trading.durationOptions}
      durationUnit={trading.durationUnit}
      setDurationUnit={trading.setDurationUnit}
      endDate={trading.endDate}
      setEndDate={trading.setEndDate}
      endTime={trading.endTime}
      setEndTime={trading.setEndTime}
      proposal={trading.proposal}
      buyContract={trading.buyContract}
      isBuying={trading.isBuying}
      buyResult={trading.buyResult}
      buyError={trading.buyError}
      clearBuyResult={trading.clearBuyResult}
      openPositions={trading.openPositions}
      sellContract={trading.sellContract}
      sellingId={trading.sellingId}
      chartData={chartData}
      getQuotes={getQuotes}
      subscribeQuotes={subscribeQuotes}
      unsubscribeQuotes={unsubscribeQuotes}
    />
  );
}

function DigitsTemplate() {
  const { ws, isConnected, isExhausted, isAuthorized, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;

  const trading = useDigitsTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated: isAuthorized,
    onAuthWSFailed: logout,
  });

  const { chartData } = useSmartChartChartData(
    ws,
    trading.isConnected,
    trading.symbols
  );

  const { getQuotes, subscribeQuotes, unsubscribeQuotes } =
    useSmartChartsApi(ws);

  return (
    <DigitsView
      authState={authState}
      accounts={accounts}
      activeAccount={activeAccount}
      onLogin={login}
      onSignUp={signUp}
      onLogout={logout}
      onSwitchAccount={switchAccount}
      logoSrc="/logo.png"
      isConnected={trading.isConnected}
      isAuthorized={isAuthorized}
      isLoading={trading.isLoading}
      error={trading.error}
      symbols={trading.symbols}
      activeSymbol={trading.activeSymbol}
      selectSymbol={trading.selectSymbol}
      currentTick={trading.currentTick}
      lastDigit={trading.lastDigit}
      digitStats={trading.digitStats}
      pipSize={trading.pipSize}
      tradeType={trading.tradeType}
      setTradeType={trading.setTradeType}
      contractMode={trading.contractMode}
      setContractMode={trading.setContractMode}
      selectedDigit={trading.selectedDigit}
      setSelectedDigit={trading.setSelectedDigit}
      stake={trading.stake}
      setStake={trading.setStake}
      duration={trading.duration}
      setDuration={trading.setDuration}
      durationLimits={trading.durationLimits}
      proposal={trading.proposal}
      isProposalLoading={trading.isProposalLoading}
      buyContract={trading.buyContract}
      isBuying={trading.isBuying}
      buyResult={trading.buyResult}
      buyError={trading.buyError}
      clearBuyResult={trading.clearBuyResult}
      chartData={chartData}
      getQuotes={getQuotes}
      subscribeQuotes={subscribeQuotes}
      unsubscribeQuotes={unsubscribeQuotes}
    />
  );
}

function DBotTemplate() {
  const { ws, isConnected, isExhausted, isAuthorized, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <Header
        authState={authState}
        accounts={accounts}
        activeAccount={activeAccount}
        onLogin={login}
        onSignUp={signUp}
        onLogout={logout}
        onSwitchAccount={switchAccount}
        logoSrc="/logo.png"
        actions={<ThemeToggle />}
      />

      <div
        className={
          authState === 'authenticated'
            ? 'h-[122px] shrink-0 sm:h-[76px]'
            : 'h-[112px] shrink-0 sm:h-[66px]'
        }
      />

      <DBotWorkspace
        ws={ws}
        isConnected={isConnected}
        isExhausted={isExhausted}
        isAuthorized={isAuthorized}
        onAuthWSFailed={logout}
      />

      <div className="fixed bottom-0 left-0 right-0 bg-background/80 py-2 text-center backdrop-blur-sm">
        <Footer />
      </div>
    </main>
  );
}

export default function MarketEyePage() {
  const [template, setTemplateState] = useState<TemplateKey>('up-down');

  useEffect(() => {
    const saved = window.localStorage.getItem('marketeye-template') as TemplateKey | null;

    if (saved === 'up-down' || saved === 'digits' || saved === 'd-bot') {
      setTemplateState(saved);
    }
  }, []);

  function setTemplate(value: TemplateKey) {
    setTemplateState(value);
    window.localStorage.setItem('marketeye-template', value);
  }

  return (
    <>
      <TemplateTabs active={template} onChange={setTemplate} />

      {template === 'up-down' && <RiseFallTemplate />}
      {template === 'digits' && <DigitsTemplate />}
      {template === 'd-bot' && <DBotTemplate />}
    </>
  );
}
