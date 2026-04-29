import { auth } from "@/lib/auth";
import {
    addInventoryItem,
    deleteInventoryItem,
    getInventory,
    updateInventoryItem
} from "@/lib/queries/inventory";

// Returns a 401 if the current session belongs to a non-manager user.
function unauthorizedResponse() {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}

// GET /api/inventory
// Returns all inventory items (ingredients). Restricted to managers.
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

// POST /api/inventory
// Adds a new ingredient to the inventory. Restricted to managers.
// Body: { ingredientname: string, quantity: number, units: string }
// Returns the newly created inventory item with a 201 status.
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

// DELETE /api/inventory?ingredientId=<id>
// Removes an ingredient from the inventory by its ID. Restricted to managers.
// Query param: ingredientId (integer)
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

export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const ingredientId = Number(searchParams.get("ingredientId"));
    if (!Number.isInteger(ingredientId)) {
        return Response.json({ error: "ingredientId is required" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const ingredientname = String(body?.ingredientname ?? "").trim();
        const units = String(body?.units ?? "").trim();
        const quantity = Number(body?.quantity);

        if (!ingredientname || !units || Number.isNaN(quantity) || quantity < 0) {
            return Response.json(
                { error: "ingredientname, quantity, and units are required" },
                { status: 400 }
            );
        }

        const updated = await updateInventoryItem(ingredientId, ingredientname, quantity, units);
        return Response.json(updated);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("PATCH /api/inventory error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}