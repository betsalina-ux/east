import Link from 'next/link';

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[70] border-t bg-background/95 px-6 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>© 2026 ChartEye. All rights reserved.</p>

        <div className="flex items-center gap-4">
          <Link
            href="/about-us"
            className="transition-colors hover:text-foreground"
          >
            About Us
          </Link>

          <span>|</span>

          <Link
            href="/terms-of-use"
            className="transition-colors hover:text-foreground"
          >
            Terms of Use
          </Link>

          <span>|</span>

          <Link
            href="/faq"
            className="transition-colors hover:text-foreground"
          >
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
}
