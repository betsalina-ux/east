'use client';

import Link from 'next/link';
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
  return Number(balance ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getAccountName(account: DerivAccount) {
  return account.account_type === 'demo' ? 'Demo account' : 'Real account';
}

function AccountLabel({ account }: { account: DerivAccount }) {
  return (
    <span
      className={cn(
        'text-xs font-bold sm:text-sm',
        account.account_type === 'demo' ? 'text-orange-500' : 'text-emerald-600'
      )}
    >
      {getAccountName(account)}
    </span>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);

  const appTitle = appName ?? process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'ChartEye';
  const logoLetter = appTitle.trim().charAt(0).toUpperCase() || 'C';

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

            <p className="mt-1 text-sm font-bold text-foreground sm:text-base">
              {formatBalance(account.balance)} {account.currency}
            </p>
          </div>

          {isActive && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
              ACTIVE
            </span>
          )}

          {isSwitching && (
            <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">
              switching...
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
      <div className="flex min-h-[64px] items-center justify-between gap-2 px-2 py-2 sm:min-h-[76px] sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {!logoSrc || logoError ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary sm:h-10 sm:w-10">
              {logoLetter}
            </div>
          ) : (
            <img
              src="/logo.png"
              alt="ChartEye Logo"
              className="h-8 w-auto shrink-0 object-contain sm:h-10 md:h-12"
              onError={() => setLogoError(true)}
            />
          )}

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight sm:text-2xl">
              <span className="text-[#04184d]">Chart</span>
              <span className="text-[#20d4c7]">Eye</span>
            </h1>

            <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
              Powered by <span className="font-semibold text-foreground">Deriv</span>
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">{actions}</div>

          {isAuthenticated && activeAccount && (
            <Popover open={accountSwitcherOpen} onOpenChange={setAccountSwitcherOpen}>
              <PopoverTrigger asChild>
                <button className="flex max-w-[155px] items-center gap-2 rounded-lg border border-border px-2 py-2 transition-colors hover:bg-muted/50 sm:max-w-none sm:px-3">
                  <div className="min-w-0 text-left">
                    <AccountLabel account={activeAccount} />

                    <p className="truncate text-sm font-bold text-foreground sm:text-base">
                      {formatBalance(activeAccount.balance)} {activeAccount.currency}
                    </p>
                  </div>

                  <svg
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
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

              <PopoverContent align="end" className="max-h-[70vh] w-72 overflow-y-auto p-2 sm:w-80">
                <div className="space-y-3">
                  {demoAccounts.length > 0 && (
                    <div>
                      <p className="px-3 pb-1 text-xs font-bold uppercase text-muted-foreground">
                        Demo wallets
                      </p>
                      <div className="space-y-1">{demoAccounts.map(renderAccountButton)}</div>
                    </div>
                  )}

                  {realAccounts.length > 0 && (
                    <div>
                      <p className="px-3 pb-1 text-xs font-bold uppercase text-muted-foreground">
                        Real wallets
                      </p>
                      <div className="space-y-1">{realAccounts.map(renderAccountButton)}</div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {isAuthenticated ? (
            <>
              <Button className="hidden sm:inline-flex" variant="destructive" onClick={onLogout}>
                Logout
              </Button>

              <Popover open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="sm:hidden">
                    ☰
                  </Button>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-52 p-2 sm:hidden">
                  <div className="flex flex-col gap-1">
                    <Link href="/about-us" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                      About Us
                    </Link>

                    <Link href="/terms-of-use" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                      Terms of Use
                    </Link>

                    <Link href="/faq" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                      FAQ
                    </Link>

                    <Link href="/contact-us" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                      Contact Us
                    </Link>

                    <button
                      type="button"
                      onClick={onLogout}
                      className="rounded-md px-3 py-2 text-left text-sm font-bold text-red-500 hover:bg-muted"
                    >
                      Logout
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onLogin} disabled={isAuthenticating}>
                {isAuthenticating ? 'Logging in...' : 'Log in'}
              </Button>

              {onSignUp && (
                <Button className="hidden sm:inline-flex" size="sm" onClick={onSignUp} disabled={isAuthenticating}>
                  Sign up
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
