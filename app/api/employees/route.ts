import { auth } from "@/lib/auth";
import { addEmployee, deleteEmployee, getEmployees } from "@/lib/queries/employees";

function unauthorizedResponse() {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

    try {
        const employees = await getEmployees();
        return Response.json(employees);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("GET /api/employees error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

    try {
        const body = await request.json();
        const name = String(body?.name ?? "").trim();
        const access = String(body?.access ?? "").trim();
        const age = Number(body?.age);
        const phone = String(body?.phone ?? "").trim();
        const password = String(body?.password ?? "").trim();
        const email = String(body?.email ?? "").trim();

        if (
            !name ||
            !access ||
            Number.isNaN(age) ||
            age <= 0 ||
            !phone ||
            !password ||
            !email
        ) {
            return Response.json(
                { error: "name, access, age, phone, password, and email are required" },
                { status: 400 }
            );
        }

        const created = await addEmployee(name, access, age, phone, password, email);
        return Response.json(created, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("POST /api/employees error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

    try {
        const { searchParams } = new URL(request.url);
        const employeeId = Number(searchParams.get("employeeId"));

        if (!Number.isInteger(employeeId)) {
            return Response.json({ error: "employeeId query param is required" }, { status: 400 });
        }

        await deleteEmployee(employeeId);
        return Response.json({ ok: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("DELETE /api/employees error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}
