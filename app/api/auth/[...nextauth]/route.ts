import { handlers } from "@/lib/auth";

// GET|POST /api/auth/[...nextauth]
// NextAuth.js catch-all route that handles all authentication flows
// (sign-in, sign-out, session, OAuth callbacks, etc.).
export const { GET, POST } = handlers;
