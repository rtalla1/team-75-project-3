import "next-auth";

declare module "next-auth" {
  interface User {
    employeeId?: number;
    role?: string;
  }
  interface Session {
    user: User & {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    employeeId?: number;
    role?: string;
  }
}
