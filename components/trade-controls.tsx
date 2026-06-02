'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EndTimePicker } from '@/components/custom/end-time-picker';
import type { DerivWS, ActiveSymbol, ProposalInfo, BuyResult } from '@deriv/core';
import type { Direction, UpDownContractType, DurationSelectUnit, DurationOption } from '../lib/types';

interface TradeControlsProps {
  contractType: UpDownContractType;
  onContractTypeChange: (value: UpDownContractType) => void;
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
  allowEquals: boolean;
  onAllowEqualsChange: (value: boolean) => void;
  barrier: string;
  onBarrierChange: (value: string) => void;
  isConnected: boolean;
  stake: string;
  onStakeChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  durationOptions: DurationOption[];
  durationUnit: DurationSelectUnit;
  onDurationUnitChange: (unit: DurationSelectUnit) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  endTime: string;
  onEndTimeChange: (time: string) => void;
  ws: DerivWS | null;
  activeSymbol: ActiveSymbol | null;
  proposal: ProposalInfo | null;
  onBuy: (direction?: Direction) => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  onClearBuyResult: () => void;
  isAuthenticated?: boolean;
}

function getContractCopy(contractType: UpDownContractType, direction: Direction) {
  if (contractType === 'higher-lower') {
    return {
      selected: direction === 'PUT' ? 'Lower' : 'Higher',
      leftDirection: 'CALL' as Direction,
      rightDirection: 'PUT' as Direction,
      leftLabel: 'Buy Higher',
      rightLabel: 'Buy Lower',
    };
  }

  if (contractType === 'touch-no-touch') {
    return {
      selected: direction === 'NOTOUCH' ? 'No Touch' : 'Touch',
      leftDirection: 'ONETOUCH' as Direction,
      rightDirection: 'NOTOUCH' as Direction,
      leftLabel: 'Buy Touch',
      rightLabel: 'Buy No Touch',
    };
  }

  return {
    selected: direction === 'PUT' ? 'Fall' : 'Rise',
    leftDirection: 'CALL' as Direction,
    rightDirection: 'PUT' as Direction,
    leftLabel: 'Buy Rise',
    rightLabel: 'Buy Fall',
  };
}

export function TradeControls({
  contractType,
  onContractTypeChange,
  direction,
  onDirectionChange,
  allowEquals,
  onAllowEqualsChange,
  barrier,
  onBarrierChange,
  isConnected,
  stake,
  onStakeChange,
  duration,
  onDurationChange,
  durationOptions,
  durationUnit,
  onDurationUnitChange,
  endDate,
  onEndDateChange,
  endTime,
  onEndTimeChange,
  ws,
  activeSymbol,
  proposal,
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

  const activeOption = durationOptions.find(o => o.unit === durationUnit);
  const canTrade = !!isAuthenticated && isConnected && !!activeSymbol && !isBuying;
  const copy = getContractCopy(contractType, direction);

  const endTimeOption = durationOptions.find(o => o.unit === 'end-time');
  const { endTimeMinDate, endTimeMaxDate } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      endTimeMinDate: today,
      endTimeMaxDate: endTimeOption
        ? new Date(today.getTime() + endTimeOption.max * 86400000)
        : new Date(today.getTime() + 365 * 86400000),
    };
  }, [endTimeOption]);

  const buyLabel = !isAuthenticated ? 'Log in to trade' : isBuying ? 'Purchasing...' : 'Buy';

  return (
    <div className="w-full space-y-2 lg:max-w-[400px] lg:space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2">
        <div>
          <p className="text-xs text-muted-foreground">Selected contract</p>
          <p className="text-sm font-bold">{copy.selected}</p>
        </div>
        <p className="text-xs text-muted-foreground">Choose by clicking a buy button below</p>
      </div>

      {contractType === 'rise-fall' && (
        <div className="flex items-center justify-between">
          <Label htmlFor="allow-equals" className="text-sm cursor-pointer">Allow equals</Label>
          <Switch
            id="allow-equals"
            checked={allowEquals}
            onCheckedChange={onAllowEqualsChange}
          />
        </div>
      )}

      {contractType !== 'rise-fall' && (
        <div className="space-y-1.5">
          <Label htmlFor="barrier" className="text-xs text-muted-foreground">Barrier</Label>
          <Input
            id="barrier"
            value={barrier}
            onChange={(e) => onBarrierChange(e.target.value)}
            placeholder="Example: +0.1 or -0.1"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="stake" className="text-xs text-muted-foreground">Stake</Label>
        <Input
          id="stake"
          type="number"
          value={stake}
          onChange={(e) => onStakeChange(e.target.value)}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
          }}
          min={0}
          step="0.01"
          labelRight="USD"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Duration</Label>
        <Select
          value={durationUnit}
          onValueChange={(v) => {
            const opt = durationOptions.find(o => o.unit === v);
            if (opt) onDurationUnitChange(opt.unit);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {durationOptions.map(opt => (
              <SelectItem key={opt.unit} value={opt.unit}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {durationUnit !== 'end-time' && (
  <Input
    type="number"
    value={duration}
    onChange={(e) => {
      const rawValue = e.target.value;

      if (rawValue === '') {
        onDurationChange(1);
        return;
      }

      const val = parseInt(rawValue, 10);

      if (!isNaN(val)) {
        onDurationChange(Math.max(1, val));
      }
    }}
    min={1}
    max={activeOption?.max}
    step={1}
  />
)}
        {durationUnit === 'end-time' && (
          <EndTimePicker
            ws={ws}
            isConnected={isConnected}
            activeSymbol={activeSymbol}
            endDate={endDate}
            onEndDateChange={onEndDateChange}
            endTime={endTime}
            onEndTimeChange={onEndTimeChange}
            minDate={endTimeMinDate}
            maxDate={endTimeMaxDate}
          />
        )}
      </div>

      {proposal && (
        <div className="rounded-lg border border-border p-3 bg-muted/20 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payout</span>
            <span className="font-bold">{proposal.payout.toFixed(2)} USD</span>
          </div>
        </div>
      )}

      <div className="max-lg:fixed max-lg:bottom-[calc(env(safe-area-inset-bottom)+3.2rem)] max-lg:left-3 max-lg:right-3 lg:static">
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            size="lg"
            disabled={!canTrade}
            onClick={() => {
              onDirectionChange(copy.leftDirection);
              void onBuy(copy.leftDirection);
            }}
          >
            {buyLabel === 'Buy' ? copy.leftLabel : buyLabel}
          </Button>
          <Button
            className="h-12 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            size="lg"
            disabled={!canTrade}
            onClick={() => {
              onDirectionChange(copy.rightDirection);
              void onBuy(copy.rightDirection);
            }}
          >
            {buyLabel === 'Buy' ? copy.rightLabel : buyLabel}
          </Button>
        </div>
      </div>

      {isAuthenticated && (
        <Button
          asChild
          variant="ghost"
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          <Link href="/reports">View your positions →</Link>
        </Button>
      )}
    </div>
  );
}
