import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const { error } = await searchParams;

  if (session?.user?.role) {
    redirect(session.user.role === "manager" ? "/manager" : "/cashier");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-display tracking-tight mb-2">Employee Login</h1>
      <p className="text-muted mb-6">Sign in with your authorized Google account.</p>
      {error && (
        <p className="text-red-500 text-sm mb-4">
          Access denied. Your Google account is not registered as an employee.
        </p>
      )}
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-accent px-6 py-3 text-white font-medium hover:opacity-90 transition"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
