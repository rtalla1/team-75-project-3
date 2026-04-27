import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ManagerStatsDashboard from "@/components/ManagerStatsDashboard";

export default async function ManagerStatsPage() {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") redirect("/login");

    return (
        <div className="min-h-screen flex flex-col">
            {/* header for the Manager */}
            <header className="bg-white border-b p-4 flex justify-between items-center">
                <h1 className="font-bold">Statistics Dashboard</h1>
                <span className="text-sm text-gray-900">{session.user.name}</span>
            </header>

            <ManagerStatsDashboard />
        </div>
    );
}
