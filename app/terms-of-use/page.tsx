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

export default function TermsPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden overflow-y-auto bg-background">
  <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <PageLogo />

        <Link href="/" className="mb-6 inline-flex rounded-lg border px-4 py-2 text-sm font-bold hover:bg-muted">
          ← Back
        </Link>

        <h2 className="mb-6 text-3xl font-bold">Terms of Use</h2>

        <p className="mb-4">By accessing or using ChartEye, you agree to be bound by these Terms of Use.</p>

        <h3 className="mt-6 mb-2 text-xl font-semibold">Platform Purpose</h3>
        <p className="mb-4">ChartEye provides trading analytics, charting tools, indicators, strategy analysis, and educational market information.</p>

        <h3 className="mt-6 mb-2 text-xl font-semibold">No Investment Advice</h3>
        <p className="mb-4">ChartEye does not provide financial, legal, tax, or investment advice.</p>

        <h3 className="mt-6 mb-2 text-xl font-semibold">Risk Disclosure</h3>
        <p className="mb-4">Trading involves substantial risk and may result in loss of capital. Users are fully responsible for their own trading decisions.</p>

        <h3 className="mt-6 mb-2 text-xl font-semibold">Third-Party Services</h3>
        <p className="mb-4">ChartEye may connect with third-party services such as Deriv. ChartEye is not responsible for third-party platform availability, policies, or actions.</p>

        <h3 className="mt-6 mb-2 text-xl font-semibold">Service Availability</h3>
        <p className="mb-4">ChartEye may modify, suspend, or discontinue features at any time without prior notice.</p>

        <div className="mt-8 rounded-lg border p-4">
          <strong>Risk Warning:</strong> Trading involves risk. ChartEye provides analytical tools and educational information only and does not provide investment advice.
        </div>
      </div>
    </main>
  );
}
