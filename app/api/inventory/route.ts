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
        const itemName = String(body?.itemname ?? "").trim();
        const unit = String(body?.unit ?? "").trim();
        const quantity = Number(body?.quantity);

        if (!itemName || !unit || Number.isNaN(quantity) || quantity < 0) {
            return Response.json({ error: "itemname, quantity, and unit are required" }, { status: 400 });
        }

        const created = await addInventoryItem(itemName, quantity, unit);
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
        const inventoryId = Number(searchParams.get("inventoryId"));

        if (!Number.isInteger(inventoryId)) {
            return Response.json({ error: "inventoryId query param is required" }, { status: 400 });
        }

        await deleteInventoryItem(inventoryId);
        return Response.json({ ok: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("DELETE /api/inventory error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}
