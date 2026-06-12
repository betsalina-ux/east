'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AuthState, DerivAccount } from '@deriv/core';

interface HeaderProps {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;
  onSignUp?: () => Promise<void>;
  logoSrc?: string;
  appName?: string;
  actions?: React.ReactNode;
}

function formatBalance(balance: string | number): string {
  const amount = Number(balance ?? 0);

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getAccountName(account: DerivAccount) {
  if (account.account_type === 'demo') return 'Demo account';
  return 'Real account';
}

function AccountLabel({ account }: { account: DerivAccount }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'text-sm font-semibold',
          account.account_type === 'demo' ? 'text-orange-500' : 'text-emerald-600'
        )}
      >
        {getAccountName(account)}
      </span>

      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {account.account_id}
      </span>
    </div>
  );
}

export function Header({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onLogout,
  onSwitchAccount,
  onSignUp,
  logoSrc,
  appName,
  actions,
}: HeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);

  const logoLetter =
    (appName ?? process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'Deriv Trading')
      .trim()
      .charAt(0)
      .toUpperCase() || 'D';

  const isAuthenticated = authState === 'authenticated';
  const isAuthenticating = authState === 'authenticating';

  const demoAccounts = accounts.filter((account) => account.account_type === 'demo');
  const realAccounts = accounts.filter((account) => account.account_type === 'real');

  async function handleSwitchAccount(accountId: string) {
    if (accountId === activeAccount?.account_id) {
      setAccountSwitcherOpen(false);
      return;
    }

    setSwitchingAccountId(accountId);

    try {
      await onSwitchAccount(accountId);
      setAccountSwitcherOpen(false);
    } finally {
      setSwitchingAccountId(null);
    }
  }

  function renderAccountButton(account: DerivAccount) {
    const isActive = account.account_id === activeAccount?.account_id;
    const isSwitching = switchingAccountId === account.account_id;

    return (
      <button
        key={account.account_id}
        onClick={() => handleSwitchAccount(account.account_id)}
        disabled={Boolean(switchingAccountId)}
        className={cn(
          'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
          isActive ? 'bg-muted' : 'hover:bg-muted/50',
          switchingAccountId && 'opacity-70'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <AccountLabel account={account} />

            <p className="mt-1 text-base font-bold text-foreground">
              {formatBalance(account.balance)} {account.currency}
            </p>
          </div>

          {isActive && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
              ACTIVE
            </span>
          )}

          {isSwitching && (
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">
              switching...
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {!logoSrc || logoError ? (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-sm font-bold text-primary">
            {logoLetter}
          </div>
        ) : (
          <img
            src={logoSrc}
            alt="App Logo"
            className="h-8 w-auto object-contain"
            onError={() => setLogoError(true)}
          />
        )}

        <h1 className="hidden text-lg font-semibold text-foreground sm:block">
          {process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'Deriv Trading'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {actions}

        {isAuthenticated && activeAccount && (
          <Popover open={accountSwitcherOpen} onOpenChange={setAccountSwitcherOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/50">
                <div className="text-left">
                  <AccountLabel account={activeAccount} />

                  <p className="text-base font-bold text-foreground">
                    {formatBalance(activeAccount.balance)} {activeAccount.currency}
                  </p>
                </div>

                <svg
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    accountSwitcherOpen && 'rotate-180'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="max-h-[70vh] w-80 overflow-y-auto p-2">
              <div className="space-y-3">
                {demoAccounts.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 text-xs font-bold uppercase text-muted-foreground">
                      Demo wallets
                    </p>

                    <div className="space-y-1">
                      {demoAccounts.map(renderAccountButton)}
                    </div>
                  </div>
                )}

                {realAccounts.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 text-xs font-bold uppercase text-muted-foreground">
                      Real wallets
                    </p>

                    <div className="space-y-1">
                      {realAccounts.map(renderAccountButton)}
                    </div>
                  </div>
                )}

                {accounts.length === 0 && (
                  <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                    No wallets found. Logout and login again.
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {isAuthenticated ? (
          <Button variant="destructive" onClick={onLogout}>
            Logout
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLogin} disabled={isAuthenticating}>
              {isAuthenticating ? 'Logging in...' : 'Log in'}
            </Button>

            {onSignUp && (
              <Button size="sm" onClick={onSignUp} disabled={isAuthenticating}>
                Sign up
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
