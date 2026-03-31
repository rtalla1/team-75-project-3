import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import pool from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Check if this Google email matches an employee in the DB
      const { rows } = await pool.query(
        "SELECT employeeid, name, access FROM employees WHERE email = $1",
        [user.email]
      );
      return rows.length > 0;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const { rows } = await pool.query(
          "SELECT employeeid, name, access FROM employees WHERE email = $1",
          [user.email]
        );
        if (rows.length > 0) {
          token.employeeId = rows[0].employeeid;
          token.name = rows[0].name;
          token.role = rows[0].access;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.employeeId = token.employeeId as number;
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
