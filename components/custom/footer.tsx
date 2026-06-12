export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[70] border-t bg-background/95 px-6 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>© 2025 MarketEye. All rights reserved.</p>

        <div className="flex items-center gap-5">
          <button type="button" className="hover:text-foreground">
            About Us
          </button>

          <span className="text-border">|</span>

          <button type="button" className="hover:text-foreground">
            Terms of Use
          </button>

          <span className="text-border">|</span>

          <button type="button" className="hover:text-foreground">
            FAQ
          </button>
        </div>
      </div>
    </footer>
  );
}
