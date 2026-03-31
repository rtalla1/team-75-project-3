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
    <main className="flex-1 flex flex-col items-center justify-center p-8 gap-10">
      <div className="text-center">
        <h1 className="text-6xl font-display tracking-tight">Employee Login</h1>
        <p className="text-muted mt-2">Sign in with your authorized Google account.</p>
        {error && (
          <p className="text-red-500 text-sm mt-3">
            Access denied. Your Google account is not registered as an employee.
          </p>
        )}
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded-xl bg-accent text-white px-10 py-4 text-lg font-medium hover:bg-accent-dark transition"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
