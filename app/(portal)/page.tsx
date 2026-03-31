import Link from "next/link";
import { signIn } from "@/lib/auth";

export default function PortalPage() {
  return (
    <>
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-10">
        <div className="text-center">
          <h1 className="text-6xl font-display tracking-tight">Taro Root</h1>
          <p className="text-muted mt-2">bubble tea & food.</p>
        </div>
        <Link
          href="/order"
          className="rounded-xl bg-accent text-white px-10 py-4 text-lg font-medium hover:bg-accent-dark transition"
        >
          Order from our Menu
        </Link>
      </main>
      <footer className="pb-6 text-center">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-sm text-muted hover:text-accent transition">
            Employee Login →
          </button>
        </form>
      </footer>
    </>
  );
}
