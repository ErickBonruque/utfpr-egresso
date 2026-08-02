import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/security-headers";

// Duas responsabilidades, ambas de borda:
//
// 1. Portão otimista: manda visitante deslogado para /login antes de renderizar
//    área protegida. A autorização de verdade continua na página/action, pelos
//    helpers de src/server/actor.ts — nunca confie só neste cookie.
//
// 2. CSP com nonce (Fase 9): o nonce é por resposta, então precisa nascer aqui
//    e viajar no header da requisição para o Next assinar os scripts inline
//    que ele mesmo injeta. Por isso o matcher passou a cobrir o site todo — o
//    da Fase 3 cobria só as rotas protegidas, e /login (a tela mais exposta, a
//    única que recebe entrada de anônimo) ficava sem política nenhuma.

const PROTECTED_PREFIXES = [
  "/admin",
  "/painel",
  "/arvore",
  "/conquistas",
  "/perfil",
  "/egressos",
  "/vagas",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV !== "production",
  });

  if (isProtected(request.nextUrl.pathname) && !getSessionCookie(request)) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Tudo que é HTML/ação; estático e imagem otimizada não executam script.
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        // Prefetch do router reaproveitaria um nonce de outra resposta; deixar
        // de fora é a recomendação do próprio Next.
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
