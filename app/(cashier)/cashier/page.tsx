import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CashierTerminal from "@/components/CashierTerminal";

export default async function CashierPage() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "cashier") redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      {/* header for the Cashier */}
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <h1 className="font-bold">Cashier Terminal</h1>
        <span className="text-sm text-gray-500">{session.user.name}</span>
      </header>

      <CashierTerminal />
    </div>
  );
}
