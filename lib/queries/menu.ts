import pool from "@/lib/db";
import { MenuItem } from "@/lib/types";

export interface MenuIngredientInput {
  ingredientid: number;
  quantity: number;
}

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
  description: string,
  ingredientMappings: MenuIngredientInput[]
): Promise<MenuItem> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "INSERT INTO menu (itemname, category, price, description) VALUES ($1, $2, $3, $4) RETURNING itemid, itemname, category, price, description",
      [itemName, category, price, description]
    );

    const createdItem = rows[0] as MenuItem;

    //create the ingredient mapping for new menu item
    for (const mapping of ingredientMappings) {
      await client.query(
        "INSERT INTO menuingredientsmap (itemid, ingredientid, quantity) VALUES ($1, $2, $3)",
        [createdItem.itemid, mapping.ingredientid, mapping.quantity]
      );
    }

    await client.query("COMMIT");
    return createdItem;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMenuItem(itemId: number): Promise<void> {
  await pool.query("DELETE FROM menu WHERE itemid = $1", [itemId]);
}
