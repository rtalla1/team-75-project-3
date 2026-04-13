import { auth } from "@/lib/auth";
import { addMenuItem, deleteMenuItem, getMenu, getMenuByCategory } from "@/lib/queries/menu";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const items = category ? await getMenuByCategory(category) : await getMenu();
    return Response.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/menu error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

  try {
    const body = await request.json();
    const itemName = String(body?.itemname ?? "").trim();
    const category = String(body?.category ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const price = Number(body?.price);

    if (!itemName || !category || Number.isNaN(price) || price < 0) {
      return Response.json({ error: "itemname, category, and price are required" }, { status: 400 });
    }

    const created = await addMenuItem(itemName, category, price, description);
    return Response.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/menu error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const itemId = Number(searchParams.get("itemId"));

    if (!Number.isInteger(itemId)) {
      return Response.json({ error: "itemId query param is required" }, { status: 400 });
    }

    await deleteMenuItem(itemId);
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("DELETE /api/menu error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
