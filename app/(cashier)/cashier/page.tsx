import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CashierPage() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "cashier") redirect("/login");

  return (
    <main className="flex-1 flex items-center justify-center">
      <h1 className="text-3xl font-bold">Cashier Terminal</h1>
    </main>
  );
}
