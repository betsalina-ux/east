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

export default function ContactUsPage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <PageLogo />

        <Link href="/" className="mb-6 inline-flex rounded-lg border px-4 py-2 text-sm font-bold hover:bg-muted">
          ← Back
        </Link>

        <section className="relative overflow-hidden rounded-3xl border bg-muted/30 px-4 py-10 sm:px-8">
          <h2 className="mb-6 text-center text-4xl font-black tracking-wide sm:text-6xl">
            CONTACT US
          </h2>

          <div className="mx-auto max-w-md rounded-3xl bg-background p-6 shadow-xl">
            <form className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Name</label>
                <input required name="name" className="w-full rounded-md border bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Email address</label>
                <input required name="email" type="email" className="w-full rounded-md border bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">WhatsApp number</label>
                <input required name="whatsapp" type="tel" className="w-full rounded-md border bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Leave a message</label>
                <textarea required name="message" rows={5} className="w-full rounded-md border bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <button type="submit" className="w-full rounded-2xl bg-black px-4 py-3 text-lg font-semibold text-white">
                Submit
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Never submit passwords or sensitive account information.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
