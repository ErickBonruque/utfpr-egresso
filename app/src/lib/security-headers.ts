// Política de segurança de conteúdo (Fase 9). Pura: monta a string do CSP a
// partir do nonce e do ambiente. O proxy aplica; os testes conferem aqui.
//
// Por que nonce e não `'unsafe-inline'`: o App Router injeta scripts inline
// (payload do RSC, streaming). Liberar inline geral tornaria o CSP decorativo
// contra XSS — que é justamente o ataque que ele existe para conter num
// sistema onde o admin cola texto (importação de matriz) e o egresso escreve
// bio e links.

export type CspOptions = {
  nonce: string;
  /// `next dev` compila no cliente com eval; produção não precisa.
  isDevelopment: boolean;
};

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
}: CspOptions): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // 'strict-dynamic' deixa o script confiável carregar os chunks do Next
    // sem precisar listar cada arquivo; navegador antigo cai no 'self'.
    "'strict-dynamic'",
    isDevelopment ? "'unsafe-eval'" : null,
  ].filter(Boolean);

  const directives: [string, string][] = [
    ["default-src", "'self'"],
    ["script-src", scriptSrc.join(" ")],
    // Tailwind e Radix escrevem style inline (variáveis de tema, posição de
    // popover). Não há nonce em atributo style, então aqui inline é inevitável
    // — o risco é baixo perto do de script.
    ["style-src", "'self' 'unsafe-inline'"],
    ["img-src", "'self' blob: data:"],
    // next/font baixa as fontes no build e serve do próprio domínio.
    ["font-src", "'self'"],
    // A busca de vagas (Adzuna) sai do servidor, não do navegador.
    ["connect-src", isDevelopment ? "'self' ws: wss:" : "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];
  if (!isDevelopment) directives.push(["upgrade-insecure-requests", ""]);

  return directives
    .map(([name, value]) => (value ? `${name} ${value}` : name))
    .join("; ");
}

/// Cabeçalhos fixos (não dependem de nonce) — ficam no next.config.ts.
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  // Impede que o navegador "adivinhe" o tipo de um upload/resposta.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Dobra o frame-ancestors do CSP para navegador que não o suporta.
  { key: "X-Frame-Options", value: "DENY" },
  // Não vaza o caminho interno (ex.: /admin/cursos/<id>) para site externo.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O sistema não usa nenhuma dessas APIs; desligar reduz superfície.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/// HSTS só faz sentido servido por https — em dev o host é http://localhost.
export const HSTS_HEADER = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
};
