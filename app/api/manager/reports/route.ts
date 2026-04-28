import { auth } from "@/lib/auth";
import { generateXReport, generateZReport } from "@/lib/queries/reports";

// Returns a 401 if the current session belongs to a non-manager user.
function unauthorizedResponse() {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}

// POST /api/manager/reports
// Generates an X or Z sales report. Restricted to managers.
// Body: { type: "x" | "z" }
//   - "x" report: a snapshot of sales since the last Z report (non-destructive).
//   - "z" report: closes out the current sales period (can only be run once per day).
// Returns 409 if a Z report has already been generated today.
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

    try {
        const body = await request.json();
        const type = body?.type;

        if (type !== "x" && type !== "z") {
            return Response.json({ error: "type must be 'x' or 'z'" }, { status: 400 });
        }

        const report = type === "x" ? await generateXReport() : await generateZReport();
        return Response.json(report);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = message.includes("already been generated") ? 409 : 500;
        console.error("POST /api/manager/reports error:", message);
        return Response.json({ error: message }, { status });
    }
}
