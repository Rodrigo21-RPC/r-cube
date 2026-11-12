import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    inferAdditionalFields({
      user: { role: { type: "string", required: false }, phone: { type: "string", required: true } },
    }),
  ],
});

export const useSession = authClient.useSession;
