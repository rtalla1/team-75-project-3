import { submitOrder } from "@/lib/queries/orders";

// POST /api/orders
// Submits a new customer order. Open to all (no auth required).
// Body: { items: OrderItem[], total: number, source?: string, customerName?: string, employeeId?: number }
// `source` defaults to "kiosk" if not provided.
// Returns: { orderId: number }
export async function POST(request: Request) {
  const body = await request.json();
  const { items, total, source, customerName, employeeId } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "Items are required" }, { status: 400 });
  }

  const orderId = await submitOrder(
    items,
    total,
    source ?? "kiosk",
    customerName ?? null,
    employeeId ?? null
  );

  return Response.json({ orderId });
}
