export function baseLayout(innerHtml: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>NestTest Notification</title>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f7fb;margin:0;padding:0}
  .container{max-width:680px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.08);overflow:hidden}
  .header{background:#111827;color:#fff;padding:24px 28px}.brand{font-size:20px;font-weight:700;letter-spacing:.3px}
  .content{padding:28px;color:#111827;line-height:1.5}.cta{display:inline-block;padding:12px 18px;border-radius:8px;text-decoration:none;background:#3b82f6;color:#fff;font-weight:600}
  .muted{color:#6b7280;font-size:12px;margin-top:24px}.footer{padding:12px 28px 28px;color:#6b7280;font-size:12px}
  </style></head><body><div class="container"><div class="header"><span class="brand">NestTest</span></div><div class="content">${innerHtml}</div><div class="footer">© ${new Date().getFullYear()} NestTest</div></div></body></html>`;
}
export function patientNotice(
  title: string,
  body: string,
  ctaUrl?: string,
  ctaText: string = 'View details',
) {
  const html = `<h1>${title}</h1><p>${body}</p>${
    ctaUrl
      ? `<p><a class="cta" href="${ctaUrl}" target="_blank" rel="noopener">${ctaText}</a></p>`
      : ''
  }
  <p class="muted">If you have questions, reply to this email or contact your provider.</p>`;
  return baseLayout(html);
}
export function providerNotice(
  title: string,
  body: string,
  ctaUrl?: string,
  ctaText: string = 'Open dashboard',
) {
  const html = `<h1>${title}</h1><p>${body}</p>${
    ctaUrl
      ? `<p><a class="cta" href="${ctaUrl}" target="_blank" rel="noopener">${ctaText}</a></p>`
      : ''
  }
  <p class="muted">This message was sent automatically by the NestTest system.</p>`;
  return baseLayout(html);
}
