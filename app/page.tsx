use client';

import { useState } from 'react';
import { useSmartChartsApi } from '@/hooks/use-smartcharts-api';
import { useSmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import { useRiseFallTrading } from '@/hooks/use-rise-fall-trading';
import { useDigitsTrading } from '@/hooks/use-digits-trading';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { RiseFallView } from '@/components/rise-fall-view';
import { DigitsView } from '@/components/digits-view';
import { Button } from '@/components/ui/button';

type TemplateKey = 'rise-fall' | 'digits';

function TemplateTabs({ active, onChange }: { active: TemplateKey; onChange: (value: TemplateKey) => void }) {
  return (
    <div className="fixed left-1/2 top-2 z-[60] flex -translate-x-1/2 gap-2 rounded-full border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur max-sm:top-1">
      <Button
        type="button"
        size="sm"
        variant={active === 'rise-fall' ? 'default' : 'ghost'}
        className="rounded-full px-4 font-bold"
        onClick={() => onChange('rise-fall')}
      >
        Rise/Fall
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
    </div>
  );
}

function RiseFallTemplate() {
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;

  const trading = useRiseFallTrading({ ws, isConnected, isExhausted, isAuthenticated: !!auth.wsUrl, onAuthWSFailed: logout });
  const { chartData } = useSmartChartChartData(trading.ws, trading.isConnected, trading.symbols);
  const { getQuotes, subscribeQuotes, unsubscribeQuotes } = useSmartChartsApi(trading.ws);

  return (
    <RiseFallView
      authState={authState}
      accounts={accounts}
      activeAccount={activeAccount}
      onLogin={login}
      onSignUp={signUp}
      onLogout={logout}
      onSwitchAccount={switchAccount}
      logoSrc="/logo.png"
      ws={trading.ws}
      isConnected={trading.isConnected}
      isLoading={trading.isLoading}
      error={trading.error}
      activeSymbol={trading.activeSymbol}
      selectSymbol={trading.selectSymbol}
      direction={trading.direction}
      setDirection={trading.setDirection}
      allowEquals={trading.allowEquals}
      setAllowEquals={trading.setAllowEquals}
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
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;

  const trading = useDigitsTrading({ ws, isConnected, isExhausted, isAuthenticated: !!auth.wsUrl, onAuthWSFailed: logout });

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
    />
  );
}

export default function MarketEyePage() {
  const [template, setTemplate] = useState<TemplateKey>('rise-fall');

  return (
    <>
      <TemplateTabs active={template} onChange={setTemplate} />
      {template === 'rise-fall' ? <RiseFallTemplate /> : <DigitsTemplate />}
    </>
  );
}
