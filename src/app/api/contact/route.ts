import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { thema, email, nachricht } = await req.json();

  if (!thema?.trim() || !email?.trim() || !nachricht?.trim()) {
    return NextResponse.json({ error: "Alle Felder sind erforderlich." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "beckstar.de Kontaktformular <onboarding@resend.dev>",
      to: "kevkoch1996@gmail.com",
      replyTo: email,
      subject: `[beckstar.de] ${thema}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px">
          <h2 style="color:#2563eb;margin:0 0 16px">Neue Nachricht über beckstar.de</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr>
              <td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:90px">Thema</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(thema)}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Von</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(email)}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f3f4f6;font-weight:600;vertical-align:top">Nachricht</td>
              <td style="padding:8px 12px;white-space:pre-wrap">${escapeHtml(nachricht)}</td>
            </tr>
          </table>
        </div>
      `,
    });
  } catch (err) {
    console.error("[contact] Resend-Fehler:", err);
    return NextResponse.json(
      { error: "E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
