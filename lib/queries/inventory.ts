import pool from "@/lib/db";

export interface InventoryRecord {
    ingredientid: number;
    ingredientname: string;
    quantity: number;
    units: string;
}

export async function getInventory(): Promise<InventoryRecord[]> {
    const { rows } = await pool.query(
        "SELECT ingredientid, ingredientname, quantity, units FROM inventory ORDER BY ingredientid"
    );
    return rows;
}

export async function addInventoryItem(
    ingredientName: string,
    quantity: number,
    units: string
): Promise<InventoryRecord> {
    const { rows } = await pool.query(
        "INSERT INTO inventory (ingredientname, quantity, units) VALUES ($1, $2, $3) RETURNING ingredientid, ingredientname, quantity, units",
        [ingredientName, quantity, units]
    );
    return rows[0];
}

export async function deleteInventoryItem(ingredientId: number): Promise<void> {
    await pool.query("DELETE FROM inventory WHERE ingredientid = $1", [ingredientId]);
}
