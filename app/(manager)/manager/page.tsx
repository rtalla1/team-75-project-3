import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ManagerTerminal from "@/components/ManagerTerminal";

export default async function ManagerPage() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "manager") redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <h1 className="font-bold">Manager Terminal</h1>
        <span className="text-sm text-gray-500">{session.user.name}</span>
      </header>

      <ManagerTerminal />
    </div>
  );
}
