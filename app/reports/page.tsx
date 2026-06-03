'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReportsTrading } from '../../hooks/use-reports-trading';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Footer } from '@/components/custom/footer';
import Link from 'next/link';
import { PositionsTable } from '@/components/custom/positions-table';

const CONTRACT_LABELS: Record<string, string> = {
  CALL: 'Rise',
  PUT: 'Fall',
  CALLE: 'Rise (Equal)',
  PUTE: 'Fall (Equal)',
  ONETOUCH: 'Touch',
  NOTOUCH: 'No Touch',
  DIGITMATCH: 'Matches',
  DIGITDIFF: 'Differs',
  DIGITOVER: 'Over',
  DIGITUNDER: 'Under',
  DIGITEVEN: 'Even',
  DIGITODD: 'Odd',
};

export default function ReportsPage() {
  const router = useRouter();
  const { ws, isConnected, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;

  const reports = useReportsTrading({
    ws,
    isConnected,
    isAuthenticated: !!auth.wsUrl,
  });

  useEffect(() => {
    if (authState === 'unauthenticated' || authState === 'error') {
      router.replace('/');
    }
  }, [authState, router]);

  if (authState !== 'authenticated') {
    return (
      <main className="flex flex-col bg-background items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-background max-lg:h-dvh max-lg:overflow-y-auto lg:min-h-dvh">
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

      <div className="h-[76px] shrink-0" />

      <div className="flex-1 w-full max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-14">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <span className="text-base leading-none">←</span>
          <span>Back</span>
        </Link>

        <PositionsTable
          openPositions={reports.openPositions}
          closedPositions={reports.closedPositions}
          onSell={reports.sellContract}
          sellingId={reports.sellingId}
          sellError={reports.sellError}
          onClearSellError={reports.clearSellError}
          contractTypeLabels={CONTRACT_LABELS}
          className="mt-0"
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 py-2 text-center bg-background/80 backdrop-blur-sm">
        <Footer />
      </div>
    </main>
  );
}
