"use client";

import Link from "next/link";
import { useState } from "react";

export default function InfoPage() {
  const [thema, setThema] = useState("");
  const [email, setEmail] = useState("");
  const [nachricht, setNachricht] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thema, email, nachricht }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Unbekannter Fehler");
      }

      setStatus("success");
      setThema("");
      setEmail("");
      setNachricht("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Senden fehlgeschlagen.");
      setStatus("error");
    }
  }

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

          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Datenquellen
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Alle angezeigten Informationen stammen ausschließlich aus öffentlich
              einsehbaren Quellen. Es werden keine nicht-öffentlichen oder
              geschützten Daten verarbeitet.
            </p>
          </section>

          {/* ── Kontaktformular ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Kontakt & Feedback
            </h2>

            {status === "success" ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
                Nachricht gesendet – danke! Ich melde mich so bald wie möglich.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Thema
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="z. B. Feedback, Fehler melden, Feature-Wunsch…"
                    value={thema}
                    onChange={(e) => setThema(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Deine E-Mail
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="damit ich dir antworten kann"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nachricht
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Deine Nachricht…"
                    value={nachricht}
                    onChange={(e) => setNachricht(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-xs text-red-500">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="self-end px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Wird gesendet…" : "Absenden"}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
