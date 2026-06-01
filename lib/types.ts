export type {
  ActiveSymbol,
  Tick,
  TicksHistoryResponse,
  ContractsForResponse,
  ContractInfo,
  DurationLimits,
  ProposalResponse,
  ProposalInfo,
  BuyResponse,
  BuyResult,
} from '@deriv/core';

export type { OpenPosition } from '@/hooks/use-open-positions';
export type { ClosedPosition } from '@/hooks/use-closed-positions';

export type Direction = 'CALL' | 'PUT' | 'ONETOUCH' | 'NOTOUCH';

export type UpDownContractType = 'rise-fall' | 'higher-lower' | 'touch-no-touch';

export type PositionFilter = 'open' | 'closed' | 'all';

export type { DurationSelectUnit, DurationOption } from '@/lib/duration-utils';


// Digit-specific types
export type ContractMode =
  | 'DIGITMATCH'
  | 'DIGITDIFF'
  | 'DIGITOVER'
  | 'DIGITUNDER'
  | 'DIGITEVEN'
  | 'DIGITODD';

export type TradeType = 'matches-differs' | 'over-under' | 'even-odd';

export interface DigitStats {
  counts: number[];
  percentages: number[];
  totalTicks: number;
}
