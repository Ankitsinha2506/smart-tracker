const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function layout(title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f1f5fb;font-family:Arial,Helvetica,sans-serif;color:#18243b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dfe7f2;border-radius:16px;overflow:hidden">
<tr><td style="padding:24px 28px;background:#102342;color:#ffffff;font-size:24px;font-weight:bold">SmartApply<div style="font-size:12px;font-weight:normal;color:#bdcce2;margin-top:6px">Your placement workspace</div></td></tr>
<tr><td style="padding:32px 28px"><h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">${escapeHtml(title)}</h1>${content}<p style="margin:28px 0 0;font-size:14px;line-height:1.6">Thank you,<br><strong>The SmartApply team</strong></p></td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #e5eaf2;color:#64748b;font-size:12px;line-height:1.6">This is an automated security email from SmartApply. Please do not reply.<br>Never share your password or password reset link with anyone.</td></tr>
</table></td></tr></table></body></html>`;
}

export function passwordResetEmail(url) {
  const safeUrl = escapeHtml(url);
  return {
    subject: 'Reset your SmartApply password',
    text: `SmartApply — Reset your password\n\nUse this link to choose a new password: ${url}\n\nThis link expires in 15 minutes. If you did not request this, ignore this email.\n\nThe SmartApply team\nThis is an automated email. Please do not reply.`,
    html: layout('Reset your password', `<p style="font-size:15px;line-height:1.7;color:#475569">We received a request to reset your SmartApply password. Use the button below to choose a new one.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">Reset password</a></p><p style="font-size:14px;line-height:1.7;color:#475569">This link expires in <strong>15 minutes</strong>. If you didn't request a reset, you can ignore this email.</p><p style="font-size:12px;line-height:1.7;color:#64748b;word-break:break-all">Button not working? Copy this link into your browser:<br><a href="${safeUrl}" style="color:#2563eb">${safeUrl}</a></p>`),
  };
}
