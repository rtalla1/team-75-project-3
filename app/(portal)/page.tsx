import Link from "next/link";
import { signIn } from "@/lib/auth";
import Grainient from "@/components/Grainient";

export default function PortalPage() {
  return (
    <>
      <div className="fixed inset-0 -z-10" aria-hidden>
        <Grainient
          color1="#f0eaf6"
          color2="#8b6aae"
          color3="#6b4e8b"
          timeSpeed={1}
          grainAnimated
        />
      </div>
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-11">
        <div className="flex flex-col items-center text-center rounded-3xl px-12 py-10 bg-white/55 backdrop-blur-md ring-1 ring-white/40 shadow-xl shadow-black/5">
          <h1 className="text-6xl font-display tracking-tight text-foreground">Taro Root</h1>
          <p className="text-foreground/60 mt-2">bubble tea & food.</p>
          <Link
            href="/order"
            className="mt-8 rounded-xl bg-accent text-white px-10 py-4 text-lg font-medium hover:bg-accent-dark hover:scale-105 transition shadow-lg shadow-accent-dark/30"
          >
            Order from our Menu
          </Link>
        </div>
      </main>
      <footer className="pb-6 text-center">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-foreground/70 hover:text-black hover:scale-105 transition rounded-full px-4 py-1.5 bg-white/50 backdrop-blur-sm ring-1 ring-white/40"
          >
            Employee Login →
          </button>
        </form>
      </footer>
    </>
  );
}
