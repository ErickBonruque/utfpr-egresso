import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser-side auth client. signIn.username covers the student RA flow;
// signIn.email covers admins.
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});
