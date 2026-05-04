import pool from "@/lib/db";
import type { PoolClient } from "pg";
import { OrderItem } from "@/lib/types";

type MenuLookup = {
  itemid: number;
  itemname: string;
  category: string;
};

type MenuIngredientRow = {
  itemid: number;
  ingredientid: number;
  quantity: number;
};

function getCupName(addOns: string[]): string {
  if (addOns.includes("Small")) return "Small Cups";
  if (addOns.includes("Large")) return "Large Cups";
  return "Medium Cups";
}

function getOrderQuantity(item: OrderItem): number {
  return Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
}

async function decrementInventory(client: PoolClient, items: OrderItem[]): Promise<void> {
  if (items.length === 0) return;

  const itemNames = Array.from(new Set(items.map((item) => item.item)));
  const { rows: menuRows } = await client.query<MenuLookup>(
    "SELECT itemid, itemname, category FROM menu WHERE itemname = ANY($1)",
    [itemNames]
  );

  const menuByName = new Map(menuRows.map((row) => [row.itemname, row]));
  const menuItemIds = Array.from(new Set(menuRows.map((row) => row.itemid)));

  const ingredientUsage = new Map<number, number>();
  if (menuItemIds.length > 0) {
    const { rows: mappingRows } = await client.query<MenuIngredientRow>(
      "SELECT itemid, ingredientid, quantity FROM menuingredientsmap WHERE itemid = ANY($1)",
      [menuItemIds]
    );

    const mappingsByItem = new Map<number, MenuIngredientRow[]>();
    for (const row of mappingRows) {
      const list = mappingsByItem.get(row.itemid) ?? [];
      list.push({ itemid: row.itemid, ingredientid: row.ingredientid, quantity: Number(row.quantity) });
      mappingsByItem.set(row.itemid, list);
    }

    for (const item of items) {
      const menuItem = menuByName.get(item.item);
      if (!menuItem) continue;
      const qty = getOrderQuantity(item);
      const mappings = mappingsByItem.get(menuItem.itemid) ?? [];
      for (const mapping of mappings) {
        ingredientUsage.set(
          mapping.ingredientid,
          (ingredientUsage.get(mapping.ingredientid) ?? 0) + mapping.quantity * qty
        );
      }
    }
  }

  const cupCounts = new Map<string, number>();
  for (const item of items) {
    const menuItem = menuByName.get(item.item);
    if (!menuItem || menuItem.category === "Food") continue;
    const qty = getOrderQuantity(item);
    const cupName = getCupName(item.addOns ?? []);
    cupCounts.set(cupName, (cupCounts.get(cupName) ?? 0) + qty);
  }

  if (ingredientUsage.size > 0) {
    for (const [ingredientid, usageQty] of ingredientUsage.entries()) {
      await client.query(
        "UPDATE inventory SET quantity = quantity - $1 WHERE ingredientid = $2",
        [usageQty, ingredientid]
      );
    }
  }

  if (cupCounts.size > 0) {
    const cupNames = Array.from(cupCounts.keys());
    const { rows: cupRows } = await client.query<{ ingredientid: number; ingredientname: string }>(
      "SELECT ingredientid, ingredientname FROM inventory WHERE ingredientname = ANY($1)",
      [cupNames]
    );
    for (const row of cupRows) {
      const usageQty = cupCounts.get(row.ingredientname) ?? 0;
      if (usageQty > 0) {
        await client.query(
          "UPDATE inventory SET quantity = quantity - $1 WHERE ingredientid = $2",
          [usageQty, row.ingredientid]
        );
      }
    }
  }
}

// Inserts a new order into the orderhistory table and returns the generated order UUID.
// `source` indicates where the order originated (e.g. "kiosk", "cashier").
// `customerName` and `employeeId` are optional and may be null.
export async function submitOrder(
  items: OrderItem[],
  total: number,
  source: string = "kiosk",
  customerName: string | null = null,
  employeeId: number | null = null
): Promise<string> {
  const orderDetails = JSON.stringify({ items });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO orderhistory (orderid, time, orderdetails, price, employeeid, status, source, customer_name)
       VALUES (gen_random_uuid(), NOW(), $1::jsonb, $2, $3, 'pending', $4, $5)
       RETURNING orderid`,
      [orderDetails, total, employeeId, source, customerName]
    );
    await decrementInventory(client, items);
    await client.query("COMMIT");
    return rows[0].orderid;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
