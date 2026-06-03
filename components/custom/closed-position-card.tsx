'use client';

import { cn } from '@/lib/utils';
import type { ClosedPosition } from '@/hooks/use-closed-positions';

interface ClosedPositionCardProps {
  pos: ClosedPosition;
  contractTypeLabels: Record<string, string>;
}

function getDirectionDisplay(
  contractType: string | undefined,
  labels: Record<string, string>
): { label: string } {
  const raw = contractType ?? '-';
  const label = labels[raw] ?? raw;
  return { label };
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function ClosedPositionCard({
  pos,
  contractTypeLabels,
}: ClosedPositionCardProps) {
  const { label: dirLabel } = getDirectionDisplay(
    pos.contract_type,
    contractTypeLabels
  );

  const buyPrice = Number(pos.buy_price ?? 0);
  const sellPrice = Number(pos.sell_price ?? 0);
  const payout = Number(pos.payout ?? 0);
  const profit = sellPrice - buyPrice;
  const isProfit = profit >= 0;
  const duration = Number(pos.sell_time ?? 0) - Number(pos.purchase_time ?? 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded px-1.5 py-0.5">
            <span className="text-xs font-bold text-foreground">
              {pos.underlying_symbol ?? '-'}
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground leading-tight">
            {pos.underlying_symbol ?? '-'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <span>{dirLabel}</span>
        </div>
      </div>

      <div>
        <span className="text-sm font-mono text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            Total profit/loss:
          </p>
          <p
            className={cn(
              'text-base font-bold',
              isProfit ? 'text-emerald-500' : 'text-destructive'
            )}
          >
            {isProfit ? '+' : ''}
            {profit.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Sell price:</p>
          <p className="text-base font-bold text-foreground">
            {sellPrice.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Stake:</p>
          <p className="text-base font-bold text-foreground">
            {buyPrice.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Payout:</p>
          <p className="text-base font-bold text-foreground">
            {payout.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
