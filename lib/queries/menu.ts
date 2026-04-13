import pool from "@/lib/db";
import { MenuItem } from "@/lib/types";

export async function getMenu(): Promise<MenuItem[]> {
  const { rows } = await pool.query(
    "SELECT itemid, itemname, category, price, description FROM menu ORDER BY itemid"
  );
  return rows;
}

export async function getMenuByCategory(category: string): Promise<MenuItem[]> {
  const { rows } = await pool.query(
    "SELECT itemid, itemname, category, price, description FROM menu WHERE category = $1 ORDER BY itemid",
    [category]
  );
  return rows;
}

export async function addMenuItem(
  itemName: string,
  category: string,
  price: number,
  description: string
): Promise<MenuItem> {
  const { rows } = await pool.query(
    "INSERT INTO menu (itemname, category, price, description) VALUES ($1, $2, $3, $4) RETURNING itemid, itemname, category, price, description",
    [itemName, category, price, description]
  );
  return rows[0];
}

export async function deleteMenuItem(itemId: number): Promise<void> {
  await pool.query("DELETE FROM menu WHERE itemid = $1", [itemId]);
}
