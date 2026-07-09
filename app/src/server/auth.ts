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
