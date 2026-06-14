import { Providers } from './providers';
import { DerivWSProvider } from './deriv-ws-provider';
import { Toaster } from '@/components/ui/sonner';
import { EnvCheck } from './env-check';

export function TemplateLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DerivWSProvider>
        {children}
      </DerivWSProvider>
      <Toaster />
      <EnvCheck />
    </Providers>
  );
}
