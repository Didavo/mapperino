import Link from "next/link";

export default function ImpressumPage() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* ── Navigationsleiste ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 mr-3">
            <Link
              href="/"
              className="text-lg font-bold text-blue-600 tracking-tight hover:text-blue-700 transition-colors"
            >
              beckstar.de
            </Link>
            <span className="hidden sm:block text-xs text-gray-400 font-normal">
              Events in der Region
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/info"
              className="text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors px-2 py-1.5"
            >
              Info
            </Link>
            <Link
              href="/impressum"
              className="text-xs font-medium text-blue-600 px-2 py-1.5"
            >
              Impressum
            </Link>
          </div>
        </div>
      </header>

      {/* ── Inhalt ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-xl w-full p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Impressum</h1>

          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Angaben gemäß § 5 DDG
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Kevin Beck<br />
              Hoffeldstraße 16<br />
              74673 Jagstberg
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Kontakt
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Über das{" "}
              <Link
                href="/info#kontakt"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Kontaktformular
              </Link>{" "}
              auf der Info-Seite.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Hinweis
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Diese Website ist ein privates, nicht-kommerzielles Hobby-Projekt.
              Es werden keine Waren oder Dienstleistungen angeboten und keine
              Einnahmen erzielt.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
