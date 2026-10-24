/**
 * Intake delivery: one place that decides where intake forms go.
 *
 * Route: FormSubmit's documented AJAX endpoint
 *   POST https://formsubmit.co/ajax/<alias-or-email>  ->  JSON {success:"true"|"false", message}
 *
 * Primary inbox: matt@kr8tiv.io. CC: Matt's personal Gmail.
 * Neither address is hard-coded here. Set them at build time:
 *   PUBLIC_INTAKE_FORMSUBMIT_ID  the random alias FormSubmit emails after activation
 *                                (falls back to the already-public matt@kr8tiv.io)
 *   PUBLIC_INTAKE_CC             optional comma list for FormSubmit `_cc`. Leave it empty
 *                                and forward matt@kr8tiv.io -> his Gmail in
 *                                Hostinger Mail instead, so the Gmail address never ships.
 * FormSubmit's AJAX route does not accept file uploads, so files are never posted.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const FORM_ID = (env.PUBLIC_INTAKE_FORMSUBMIT_ID || 'matt@kr8tiv.io').trim();
const CC = (env.PUBLIC_INTAKE_CC || '').trim();
export const INTAKE_ENDPOINT = `https://formsubmit.co/ajax/${FORM_ID}`;

/** Minimum time a human needs before submitting (bots post instantly). */
export const MIN_FILL_MS = 4000;

export type SendResult = { ok: true } | { ok: false; reason: string };

export async function sendIntake(fields: Record<string, string>, opts: { subject: string; replyTo: string; site: string }): Promise<SendResult> {
  const body: Record<string, string> = {
    ...fields,
    _subject: opts.subject,
    _replyto: opts.replyTo,
    _template: 'table',
    _captcha: 'false',
    _source: opts.site,
  };
  if (CC) body._cc = CC;
  try {
    const resp = await fetch(INTAKE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return { ok: false, reason: `HTTP ${resp.status}` };
    const json = (await resp.json().catch(() => null)) as { success?: string | boolean; message?: string } | null;
    // FormSubmit answers 200 with success:"false" for unactivated forms etc.
    if (!json || String(json.success) !== 'true') return { ok: false, reason: json?.message || 'Unexpected response' };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
