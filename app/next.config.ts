import type { NextConfig } from "next";
import {
  HSTS_HEADER,
  STATIC_SECURITY_HEADERS,
} from "./src/lib/security-headers";

// O CSP (que depende de nonce por resposta) é aplicado em src/proxy.ts; aqui
// ficam só os cabeçalhos fixos. HSTS entra apenas em produção — em dev o host
// é http://localhost e o navegador passaria a exigir https dele para sempre.
// (Fase 9)
const nextConfig: NextConfig = {
  // Não anunciar "X-Powered-By: Next.js": versão de framework é informação
  // gratuita para quem procura CVE conhecida.
  poweredByHeader: false,
  async headers() {
    const headers = [...STATIC_SECURITY_HEADERS];
    if (process.env.NODE_ENV === "production") headers.push(HSTS_HEADER);
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
