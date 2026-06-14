import Link from 'next/link';

export default function ContactUsPage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-4 inline-flex rounded-lg border px-4 py-2 text-sm font-bold hover:bg-muted">
          ← Back
        </Link>

        <section className="relative overflow-hidden rounded-3xl border bg-muted/30 px-4 py-10 sm:px-8">
          <h1 className="mb-6 text-center text-4xl font-black tracking-wide sm:text-6xl">
            CONTACT US
          </h1>

          <div className="mx-auto max-w-md rounded-3xl bg-background p-6 shadow-xl">
            <form className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Name</label>
                <input className="w-full rounded-md border bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Email address</label>
                <input type="email" className="w-full rounded-md border bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">WhatsApp number</label>
                <input className="w-full rounded-md border bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Leave a message</label>
                <textarea rows={5} className="w-full rounded-md border bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-primary" />
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
