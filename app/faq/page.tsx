import Link from 'next/link';

function PageLogo() {
  return (
    <div className="mb-6 flex items-center gap-3">
      <img src="/logo.png" alt="ChartEye" className="h-10 w-auto" />
      <div>
        <h1 className="text-2xl font-bold leading-tight">
          <span className="text-[#04184d]">Chart</span>
          <span className="text-[#20d4c7]">Eye</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">Deriv</span>
        </p>
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <PageLogo />

        <Link href="/" className="mb-6 inline-flex rounded-lg border px-4 py-2 text-sm font-bold hover:bg-muted">
          ← Back
        </Link>

        <h2 className="mb-6 text-3xl font-bold">Frequently Asked Questions</h2>

        <div className="space-y-6">
          <div><h3 className="font-bold">1. How do I deposit funds?</h3><p>After signing up, log in to your Deriv account and make a deposit using any of the available payment methods on Deriv. Once your funds are available in your Deriv account, transfer them to your Deriv Options wallet if required before trading through ChartEye.</p></div>

          <div><h3 className="font-bold">2. How do I withdraw funds?</h3><p>All withdrawals are processed through your Deriv account. To withdraw funds, log in to your account on Deriv.com and follow the withdrawal instructions provided on their platform.</p></div>

          <div><h3 className="font-bold">3. How do I use ChartEye?</h3><p>Watch tutorials on our blog and official social media channels. We regularly publish guides, tips, and updates to help users get the most out of the platform.</p></div>

          <div><h3 className="font-bold">4. Does ChartEye hold my money?</h3><p>No. ChartEye does not hold customer funds. Deposits, withdrawals, and balances are managed directly by Deriv.</p></div>

          <div><h3 className="font-bold">5. Is ChartEye free to use?</h3><p>Some features may be free, while others may require a subscription or premium access.</p></div>

          <div><h3 className="font-bold">6. Does ChartEye guarantee profits?</h3><p>No. ChartEye provides tools and educational information only. Trading involves risk.</p></div>

          <div><h3 className="font-bold">7. I am having trouble logging in. What should I do?</h3><p>Check your Deriv login details and internet connection. If the issue continues, contact support.</p></div>

          <div><h3 className="font-bold">8. Where can I get support?</h3><p>You can get support through our website, blog, or social media channels.</p></div>

          <div>
            <h3 className="font-bold">9. I logged in, but I am not being redirected back to ChartEye. What should I do?</h3>
            <p>When logging in through Deriv, make sure you click Allow when the authorization request appears. You can also log out of Deriv and try again, open ChartEye in a new browser window, use Incognito mode, clear cache and cookies, and make sure pop-ups and redirects are not blocked.</p>
          </div>

          <div><h3 className="font-bold">10. Does ChartEye execute trades on my behalf?</h3><p>ChartEye provides tools and strategy-based insights. Any trades are initiated by the user or tools the user activates.</p></div>

          <div><h3 className="font-bold">11. Which brokers or platforms does ChartEye support?</h3><p>ChartEye currently integrates with Deriv and related trading services.</p></div>

          <div><h3 className="font-bold">12. Can I use ChartEye on mobile devices?</h3><p>Yes. ChartEye is designed for desktop, tablets, and mobile devices.</p></div>

          <div><h3 className="font-bold">13. Why is my account balance different from Deriv?</h3><p>Your actual account balance is maintained by Deriv. Refresh the page, reconnect your account, or check Deriv directly.</p></div>

          <div><h3 className="font-bold">14. How can I stay updated?</h3><p>Follow our blog and social media accounts, or sign up for our email list.</p></div>
        </div>

        <div className="mt-8 rounded-lg border p-4">
          <strong>Risk Warning:</strong> Trading involves risk. ChartEye provides analytical tools and educational information only and does not provide investment advice.
        </div>
      </div>
    </main>
  );
}
