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

export default function AboutUsPage() {
  return (
    <main className="fixed inset-0 w-full overflow-x-hidden overflow-y-scroll bg-background">
  <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <PageLogo />

        <Link href="/" className="mb-6 inline-flex rounded-lg border px-4 py-2 text-sm font-bold hover:bg-muted">
          ← Back
        </Link>

        <h2 className="mb-6 text-3xl font-bold">About ChartEye</h2>

        <p className="mb-4">ChartEye is a trading analytics and market monitoring platform designed to help traders analyze financial markets and identify potential trading opportunities.</p>

        <p className="mb-4">Our mission is to provide traders with easy-to-use tools, market insights, and strategy-based analysis that can assist in making informed trading decisions.</p>

        <p className="mb-4">ChartEye connects with supported trading platforms to display market information, chart data, and analytical tools in a simple and accessible interface.</p>

        <p className="mb-4">ChartEye does not provide financial, investment, legal, or tax advice.</p>

        <div className="mt-8 rounded-lg border p-4">
          <strong>Risk Warning:</strong> Trading involves risk. ChartEye provides analytical tools and educational information only and does not provide investment advice.
        </div>
      </div>
    </main>
  );
}
