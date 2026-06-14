import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-background/95 px-3 py-3 backdrop-blur-sm sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center text-[11px] text-muted-foreground sm:flex-row sm:text-xs">
        <p>© 2026 ChartEye. All rights reserved.</p>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link href="/about-us" className="transition-colors hover:text-foreground">About Us</Link>
          <span>|</span>
          <Link href="/terms-of-use" className="transition-colors hover:text-foreground">Terms of Use</Link>
          <span>|</span>
          <Link href="/faq" className="transition-colors hover:text-foreground">FAQ</Link>
          <span>|</span>
          <Link href="/contact-us" className="transition-colors hover:text-foreground">Contact Us</Link>
        </div>
      </div>
    </footer>
  );
}
