export function inviteEmail({
  workspaceName,
  inviterName,
  acceptUrl,
  role,
}: {
  workspaceName: string;
  inviterName: string;
  acceptUrl: string;
  role: string;
}) {
  const subject = `${inviterName} invited you to ${workspaceName}`;
  const html = `
<!doctype html>
<html>
  <body style="font-family: -apple-system, system-ui, sans-serif; background: #f5f5f3; padding: 40px 20px;">
    <div style="max-width: 480px; margin: 0 auto; background: #fff; border: 0.5px solid #ddd; border-radius: 12px; padding: 32px;">
      <div style="display: inline-block; width: 32px; height: 32px; line-height: 32px; text-align: center; background: #1a1a1a; color: #fff; border-radius: 8px; font-weight: 500;">D</div>
      <h1 style="font-size: 18px; font-weight: 500; margin: 16px 0 4px;">You're invited to ${workspaceName}</h1>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px;">${inviterName} invited you as <strong>${role.replace("_", " ")}</strong>.</p>
      <a href="${acceptUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-size: 14px;">Accept invite</a>
      <p style="color: #999; font-size: 12px; margin-top: 28px;">If you didn't expect this, you can ignore this email.</p>
    </div>
  </body>
</html>
`;
  const text = `${inviterName} invited you to ${workspaceName} as ${role}. Accept: ${acceptUrl}`;
  return { subject, html, text };
}
