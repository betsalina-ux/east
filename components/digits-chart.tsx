'use client';

import { SmartChartWrapper } from '@/components/custom/smart-chart';
import type { ContractMarker } from '@/lib/chart-markers';
import type { UseSmartChartsApiReturn } from '@/hooks/use-smartcharts-api';
import type { SmartChartChartData } from '@/hooks/use-smartchart-chart-data';

export interface DigitsChartProps {
  symbolKey: string;
  symbol: string | undefined;
  isConnectionOpened: boolean;
  isMobile: boolean;
  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];
  onSymbolChange?: (symbol: string) => void;
  isLive?: boolean;
  endEpoch?: number;
  contractsArray?: ContractMarker[];
}

export function DigitsChart(props: DigitsChartProps) {
  if (!props.symbol) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        Loading chart...
      </div>
    );
  }

  return (
    <SmartChartWrapper
      key={`digits-${props.symbol}-${props.isConnectionOpened ? 'on' : 'off'}`}
      chartId="digits-chart"
      defaultGranularity={60}
      {...props}
    />
  );
}
