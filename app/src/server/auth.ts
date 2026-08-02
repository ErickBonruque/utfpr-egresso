import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "./db";

// Auth server (Fase 3). Two login flows share this instance:
//   - Students: RA + password via the username plugin (username = RA). Until
//     the UTFPR integration (Fase 8) exists, credentials are mocked: seeded
//     accounts with locally hashed passwords. When the real provider arrives,
//     only credential validation changes — session/RBAC stay as-is.
//   - Admins: email + password.
// Public sign-up is disabled: students come from the seed (later from the
// UTFPR sync) and admins are created by other admins (Fase 4).
export const auth = betterAuth({
  appName: "CEA",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  // Freio de força bruta (Fase 9). Sem senha recuperável no sistema, a única
  // porta de entrada é adivinhar a senha de um RA — e RA é público. Dois
  // níveis: um teto geral para toda a API de auth e um limite mais apertado
  // nos dois endpoints de login (aluno por RA, admin por e-mail).
  //
  // `storage: "database"` (tabela rate_limits) porque em serverless cada
  // instância teria o próprio contador em memória: o atacante ganharia N
  // vezes o limite só por cair em instâncias diferentes.
  //
  // 30/min e não 5/min porque o Better Auth conta por IP: o laboratório de
  // informática do campus sai todo por um NAT só, e um limite apertado
  // trancaria a turma inteira na aula em que o professor pede para acessar.
  // O bloqueio por conta (que resolveria isso direito) depende de contador
  // por usuário — anotado no doc da fase; quando a autenticação for delegada
  // à UTFPR (Fase 8), o freio passa a ser problema do provedor de identidade.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 200,
    customRules: {
      "/sign-in/email": { window: 60, max: 30 },
      "/sign-in/username": { window: 60, max: 30 },
    },
  },
  plugins: [
    username({
      // RA shape hoje: letra + dígitos (ex.: a2587246). Mantemos flexível —
      // o formato oficial pode variar entre campi.
      minUsernameLength: 3,
    }),
    // Must be the last plugin: makes auth.api calls set cookies in server actions.
    nextCookies(),
  ],
});

export type ServerSession = typeof auth.$Infer.Session;
