export default function FAQPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">
        Frequently Asked Questions
      </h1>

      <div className="space-y-6">
        <div>
          <h2 className="font-bold">How do I deposit funds?</h2>
          <p>Deposit directly through your Deriv account.</p>
        </div>

        <div>
          <h2 className="font-bold">How do I withdraw funds?</h2>
          <p>Withdraw directly through your Deriv account.</p>
        </div>

        <div>
          <h2 className="font-bold">How do I use ChartEye?</h2>
          <p>Watch tutorials on our blog and social media channels.</p>
        </div>

        <div>
          <h2 className="font-bold">
            I logged in but was not redirected back.
          </h2>
          <p>
            Make sure you click Allow during Deriv authorization. You can also
            try a new browser window or Incognito mode.
          </p>
        </div>

        <div>
          <h2 className="font-bold">Does ChartEye guarantee profits?</h2>
          <p>No. Trading involves risk and profits cannot be guaranteed.</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border p-4">
        <strong>Risk Warning:</strong> Trading involves risk. ChartEye provides analytical tools and educational information only and does not provide investment advice.
      </div>
    </div>
  );
}
