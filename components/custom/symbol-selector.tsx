'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ActiveSymbol } from '@deriv/core';

interface SymbolSelectorProps {
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  onSymbolChange: (symbol: string) => void;
}

function groupBySubmarket(symbols: ActiveSymbol[]): Map<string, ActiveSymbol[]> {
  const groups = new Map<string, ActiveSymbol[]>();
  for (const symbol of symbols) {
    const key = symbol.submarket;
    const group = groups.get(key);
    if (group) {
      group.push(symbol);
    } else {
      groups.set(key, [symbol]);
    }
  }
  return groups;
}

export function SymbolSelector({
  symbols,
  activeSymbol,
  onSymbolChange,
}: SymbolSelectorProps) {
  const grouped = useMemo(() => groupBySubmarket(symbols), [symbols]);

  return (
    <Select
      value={activeSymbol?.underlying_symbol ?? ''}
      onValueChange={onSymbolChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a symbol" />
      </SelectTrigger>
      <SelectContent>
        {Array.from(grouped.entries()).map(([submarket, group]) => (
          <SelectGroup key={submarket}>
            <SelectLabel>{submarket}</SelectLabel>
            {group.map((symbol) => (
              <SelectItem
                key={symbol.underlying_symbol}
                value={symbol.underlying_symbol}
              >
                {symbol.underlying_symbol_name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
