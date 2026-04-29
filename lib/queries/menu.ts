import pool from "@/lib/db";
import { MenuItem } from "@/lib/types";

// Represents a single ingredient-to-menu-item mapping used when creating a menu item.
export interface MenuIngredientInput {
  ingredientid: number;
  quantity: number; // amount of this ingredient consumed per order of the item
}

// Fetches all menu items from the database, ordered by itemid.
export async function getMenu(): Promise<MenuItem[]> {
  const { rows } = await pool.query(
    "SELECT itemid, itemname, category, price, description FROM menu ORDER BY itemid"
  );
  return rows;
}

// Fetches all menu items belonging to a specific category, ordered by itemid.
export async function getMenuByCategory(category: string): Promise<MenuItem[]> {
  const { rows } = await pool.query(
    "SELECT itemid, itemname, category, price, description FROM menu WHERE category = $1 ORDER BY itemid",
    [category]
  );
  return rows;
}

// Creates a new menu item and its ingredient mappings in a single transaction.
// Rolls back if any insert fails, ensuring the menu and mapping tables stay in sync.
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

// Deletes a menu item by its ID. Does nothing if the ID doesn't exist.
export async function deleteMenuItem(itemId: number): Promise<void> {
  await pool.query("DELETE FROM menu WHERE itemid = $1", [itemId]);
}

export async function updateMenuItem(
    itemId: number,
    itemname: string,
    category: string,
    price: number,
    description: string
): Promise<MenuItem> {
    const { rows } = await pool.query(
        `UPDATE menu
         SET itemname=$1, category=$2, price=$3, description=$4
         WHERE itemid=$5
         RETURNING itemid, itemname, category, price, description`,
        [itemname, category, price, description, itemId]
    );
    return rows[0];
}