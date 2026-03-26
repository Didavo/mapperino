import Link from "next/link";

export default function InfoPage() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* ── Navigationsleiste ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Logo */}
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

          {/* Info-Link */}
          <Link
            href="/info"
            className="ml-auto text-xs font-medium text-blue-600 px-2 py-1.5"
          >
            Info
          </Link>
        </div>
      </header>

      {/* ── Inhalt ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-xl w-full p-8">
          <h1 className="text-2xl font-bold text-blue-600 mb-1">beckstar.de</h1>
          <p className="text-sm text-gray-400 mb-6">Events in der Region</p>

          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Über dieses Projekt
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              beckstar.de ist ein privates Hobby-Projekt und wird ohne kommerzielle
              Absicht betrieben. Es wird kein Geld damit erwirtschaftet.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Datenquellen
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Alle angezeigten Informationen stammen ausschließlich aus öffentlich
              einsehbaren Quellen. Es werden keine nicht-öffentlichen oder
              geschützten Daten verarbeitet.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Kontakt & Feedback
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Du hast einen Änderungswunsch, eine Idee für ein neues Feature oder
              möchtest eine Quelle melden? Meld dich gerne:
            </p>
            <a
              href="mailto:info@beckstar.de"
              className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              info@beckstar.de
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
