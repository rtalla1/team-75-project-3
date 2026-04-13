import { auth } from "@/lib/auth";
import {
    addInventoryItem,
    deleteInventoryItem,
    getInventory,
} from "@/lib/queries/inventory";

function unauthorizedResponse() {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

    try {
        const inventory = await getInventory();
        return Response.json(inventory);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("GET /api/inventory error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

    try {
        const body = await request.json();
        const ingredientName = String(body?.ingredientname ?? "").trim();
        const units = String(body?.units ?? "").trim();
        const quantity = Number(body?.quantity);

        if (!ingredientName || !units || Number.isNaN(quantity) || quantity < 0) {
            return Response.json({ error: "ingredientname, quantity, and units are required" }, { status: 400 });
        }

        const created = await addInventoryItem(ingredientName, quantity, units);
        return Response.json(created, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("POST /api/inventory error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

    try {
        const { searchParams } = new URL(request.url);
        const ingredientId = Number(searchParams.get("ingredientId"));

        if (!Number.isInteger(ingredientId)) {
            return Response.json({ error: "ingredientId query param is required" }, { status: 400 });
        }

        await deleteInventoryItem(ingredientId);
        return Response.json({ ok: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("DELETE /api/inventory error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}
