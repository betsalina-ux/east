import Link from 'next/link';
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="mb-4 inline-flex rounded-lg border px-4 py-2 text-sm font-bold hover:bg-muted">
  ← Back
</Link>
      <h1 className="mb-6 text-3xl font-bold">Terms of Use</h1>

      <p className="mb-4">
        By accessing or using ChartEye, you agree to be bound by these Terms of Use.
      </p>

      <h2 className="mt-6 mb-2 text-xl font-semibold">Platform Purpose</h2>

      <p className="mb-4">
        ChartEye provides trading analytics, charting tools, indicators, strategy analysis and educational market information.
      </p>

      <h2 className="mt-6 mb-2 text-xl font-semibold">No Investment Advice</h2>

      <p className="mb-4">
        ChartEye does not provide financial, legal, tax, or investment advice.
      </p>

      <h2 className="mt-6 mb-2 text-xl font-semibold">Risk Disclosure</h2>

      <p className="mb-4">
        Trading involves substantial risk and may result in loss of capital.
      </p>

      <div className="mt-8 rounded-lg border p-4">
        <strong>Risk Warning:</strong> Trading involves risk. ChartEye provides analytical tools and educational information only and does not provide investment advice.
      </div>
    </div>
  );
}
