// Production links always use the configured public frontend. In development,
// keep the hostname used by this computer or phone and change only the port.
export function getInvitationOrigin(currentOrigin: string, configuredSiteUrl: string | undefined, development: boolean) {
  if (!development && !configuredSiteUrl) throw new Error("Set NEXT_PUBLIC_SITE_URL for invitation links.");
  const frontend = new URL(configuredSiteUrl ?? "http://localhost:3000");
  if (!development) return frontend.origin;
  const current = new URL(currentOrigin);
  current.port = frontend.port;
  return current.origin;
}
