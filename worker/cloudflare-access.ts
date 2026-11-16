// Cloudflare Access gate for the self-hosted Cloudflare deployment only.
// The OpenAI Sites build keeps using worker/index.ts unchanged.
// Fails closed: without a verified Access JWT for the configured team and
// application audience, no request reaches the app.

type AccessEnv = { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string };
type Jwk = JsonWebKey & { kid?: string };

const CERT_TTL_MS = 60 * 60 * 1000;
let certCache: { team: string; keys: Jwk[]; fetchedAt: number } | null = null;

function b64urlBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function b64urlJson(s: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

async function accessKeys(team: string, refresh: boolean): Promise<Jwk[]> {
  if (!refresh && certCache && certCache.team === team && Date.now() - certCache.fetchedAt < CERT_TTL_MS) {
    return certCache.keys;
  }
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error("access certs unavailable");
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  certCache = { team, keys, fetchedAt: Date.now() };
  return keys;
}

export async function verifyAccessJwt(token: string, team: string, aud: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  let header: Record<string, unknown>, payload: Record<string, unknown>;
  try {
    header = b64urlJson(parts[0]);
    payload = b64urlJson(parts[1]);
  } catch {
    return false;
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string") return false;

  let key = (await accessKeys(team, false)).find((k) => k.kid === header.kid);
  if (!key) key = (await accessKeys(team, true)).find((k) => k.kid === header.kid);
  if (!key) return false;

  const cryptoKey = await crypto.subtle.importKey(
    "jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
  );
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, b64urlBytes(parts[2]), signed);
  if (!valid) return false;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(aud)) return false;
  if (payload.iss !== `https://${team}`) return false;
  if (typeof payload.exp !== "number" || payload.exp <= now) return false;
  if (typeof payload.nbf === "number" && payload.nbf > now + 60) return false;
  return true;
}

const deny = (status: number, message: string) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export function withCloudflareAccess<E extends AccessEnv, C>(
  inner: { fetch(request: Request, env: E, ctx: C): Response | Promise<Response> },
) {
  return {
    async fetch(request: Request, env: E, ctx: C): Promise<Response> {
      const team = env.ACCESS_TEAM_DOMAIN?.trim() ?? "";
      const aud = env.ACCESS_AUD?.trim() ?? "";
      if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !aud) {
        return deny(503, "Cloudflare Access is not configured for this deployment.");
      }
      const token = request.headers.get("cf-access-jwt-assertion");
      let ok = false;
      try {
        ok = token ? await verifyAccessJwt(token, team, aud) : false;
      } catch {
        return deny(503, "Unable to verify Cloudflare Access sign-in. Please retry.");
      }
      if (!ok) return deny(403, "Cloudflare Access sign-in required.");
      return inner.fetch(request, env, ctx);
    },
  };
}
