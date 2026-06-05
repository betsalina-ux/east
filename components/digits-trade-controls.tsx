'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  ContractMode,
  TradeType,
  DurationLimits,
  ProposalInfo,
  BuyResult,
} from '../lib/types';

interface TradeControlsProps {
  tradeType: TradeType;
  contractMode: ContractMode;
  onContractModeChange: (mode: ContractMode) => void;
  selectedDigit: number;
  isConnected: boolean;
  stake: string;
  onStakeChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  durationLimits: DurationLimits;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  onBuy: (mode?: ContractMode) => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  onClearBuyResult: () => void;
  isAuthenticated?: boolean;
}

const CONTRACT_MODE_OPTIONS: Record<TradeType, { value: ContractMode; label: string }[]> = {
  'matches-differs': [
    { value: 'DIGITMATCH', label: 'Matches' },
    { value: 'DIGITDIFF', label: 'Differs' },
  ],
  'over-under': [
    { value: 'DIGITOVER', label: 'Over' },
    { value: 'DIGITUNDER', label: 'Under' },
  ],
  'even-odd': [
    { value: 'DIGITEVEN', label: 'Even' },
    { value: 'DIGITODD', label: 'Odd' },
  ],
};

function getPredictionText(contractMode: ContractMode): string {
  switch (contractMode) {
    case 'DIGITMATCH':
      return 'match';
    case 'DIGITDIFF':
      return 'differ from';
    case 'DIGITOVER':
      return 'be over';
    case 'DIGITUNDER':
      return 'be under';
    case 'DIGITEVEN':
      return 'be even';
    case 'DIGITODD':
      return 'be odd';
  }
}

function showDigitInPrediction(contractMode: ContractMode): boolean {
  return contractMode !== 'DIGITEVEN' && contractMode !== 'DIGITODD';
}

export function TradeControls({
  tradeType,
  contractMode,
  onContractModeChange,
  selectedDigit,
  isConnected,
  stake,
  onStakeChange,
  duration,
  onDurationChange,
  durationLimits,
  proposal,
  isProposalLoading,
  onBuy,
  isBuying,
  buyResult,
  buyError,
  onClearBuyResult,
  isAuthenticated,
}: TradeControlsProps) {
  useEffect(() => {
    if (buyError) {
      toast.error('Purchase Failed', { description: buyError });
      onClearBuyResult();
    }
  }, [buyError, onClearBuyResult]);

  useEffect(() => {
    if (buyResult) {
      toast.success('Contract Purchased', {
        description: `Buy price: ${buyResult.buyPrice.toFixed(2)} USD | Payout: ${buyResult.payout.toFixed(2)} USD | Balance: ${buyResult.balanceAfter.toFixed(2)} USD`,
      });
      window.dispatchEvent(new CustomEvent('marketeye:refresh-accounts'));
      onClearBuyResult();
    }
  }, [buyResult, onClearBuyResult]);

  const modeOptions = CONTRACT_MODE_OPTIONS[tradeType];
  const canTrade = !!isAuthenticated && isConnected && !isBuying;
  const buyLabel = !isAuthenticated ? 'Log in to trade' : isBuying ? 'Purchasing...' : 'Buy';

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="rounded-xl border border-border bg-muted/20 px-3 py-2"> 
        <div className="rounded-xl border border-border bg-muted/20 p-3">
  <p className="text-xs text-muted-foreground mb-2">
    Last digit prediction
  </p>

  <div className="grid grid-cols-5 gap-2">
    {[0,1,2,3,4,5,6,7,8,9].map(digit => (
      <button
        key={digit}
        type="button"
        onClick={() => setSelectedDigit(digit)}
        className={`h-12 rounded-lg border text-lg font-bold transition ${
          selectedDigit === digit
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background hover:bg-muted'
        }`}
      >
        {digit}
      </button>
    ))}
  </div>
</div>
        <p className="text-xs text-muted-foreground">Selected contract</p>
        <p className="text-sm font-bold">
          {modeOptions.find(opt => opt.value === contractMode)?.label ?? 'Contract'}
        </p>
        <p className="text-xs text-muted-foreground">Choose by clicking a buy button below</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="stake" className="text-xs text-muted-foreground">
            Stake
          </Label>
          <Input
            id="stake"
            type="number"
            value={stake}
            onChange={e => onStakeChange(e.target.value)}
            onKeyDown={e => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            min={0}
            step="0.01"
            labelRight="USD"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration" className="text-xs text-muted-foreground">
            Duration
          </Label>
          <Input
            id="duration"
            type="number"
            value={duration}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) onDurationChange(val);
            }}
            min={durationLimits.min}
            max={durationLimits.max}
            step={1}
            labelRight="Ticks"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-2 sm:p-3 bg-muted/20 space-y-1.5 sm:space-y-2">
        <p className="text-[11px] sm:text-xs text-muted-foreground mb-0 sm:mb-1">Prediction</p>
        <p className="text-xs sm:text-sm font-medium">
          Last digit of the price will{' '}
          <span className="text-primary font-bold">{getPredictionText(contractMode)}</span>
          {showDigitInPrediction(contractMode) && (
            <>
              {' '}
              <span className="inline-flex w-5 h-5 rounded-full bg-primary text-primary-foreground items-center justify-center text-xs font-bold">
                {selectedDigit}
              </span>
            </>
          )}
        </p>
        {(proposal || isProposalLoading) && (
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground">Payout</span>
            {isProposalLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="text-sm font-bold text-foreground">
                {proposal!.payout.toFixed(2)} USD
              </span>
            )}
          </div>
        )}
      </div>

      <div className="max-lg:fixed max-lg:bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] max-lg:left-3 max-lg:right-3 lg:static">
        <div className="grid grid-cols-2 gap-3">
          {modeOptions.map((opt, index) => (
            <Button
              key={opt.value}
              className={`h-12 rounded-full px-6 sm:h-11 sm:px-8 font-bold ${index === 1 ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}`}
              disabled={!canTrade}
              onClick={() => {
                onContractModeChange(opt.value);
                void onBuy(opt.value);
              }}
            >
              {buyLabel === 'Buy' ? `Buy ${opt.label}` : buyLabel}
            </Button>
          ))}
        </div>
      </div>

      {isAuthenticated && (
        <Button asChild variant="ghost" className="w-full text-sm text-muted-foreground hover:text-foreground">
          <Link href="/reports">View your positions →</Link>
        </Button>
      )}
    </div>
  );
}
