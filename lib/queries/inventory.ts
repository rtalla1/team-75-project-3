import pool from "@/lib/db";

// Represents a row from the inventory table.
export interface InventoryRecord {
    ingredientid: number;
    ingredientname: string;
    quantity: number;
    units: string; // e.g. "oz", "ml", "count"
}

// Fetches all inventory items from the database, ordered by ingredientid.
export async function getInventory(): Promise<InventoryRecord[]> {
    const { rows } = await pool.query(
        "SELECT ingredientid, ingredientname, quantity, units FROM inventory ORDER BY ingredientid"
    );
    return rows;
}

// Inserts a new ingredient into the inventory and returns the created record.
export async function addInventoryItem(
    ingredientName: string,
    quantity: number,
    units: string
): Promise<InventoryRecord> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows: idRows } = await client.query(
            "SELECT COALESCE(MAX(ingredientid), 0) + 1 AS next_id FROM inventory"
        );
        const nextId = Number(idRows[0]?.next_id ?? 1);
        const { rows } = await client.query(
            "INSERT INTO inventory (ingredientid, ingredientname, quantity, units) VALUES ($1, $2, $3, $4) RETURNING ingredientid, ingredientname, quantity, units",
            [nextId, ingredientName, quantity, units]
        );
        await client.query("COMMIT");
        return rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

// Deletes an inventory item by its ID. Does nothing if the ID doesn't exist.
export async function deleteInventoryItem(ingredientId: number): Promise<void> {
    await pool.query("DELETE FROM inventory WHERE ingredientid = $1", [ingredientId]);
}

export async function updateInventoryItem(
    ingredientId: number,
    ingredientname: string,
    quantity: number,
    units: string
): Promise<InventoryRecord> {
    const { rows } = await pool.query(
        `UPDATE inventory
         SET ingredientname=$1, quantity=$2, units=$3
         WHERE ingredientid=$4
         RETURNING ingredientid, ingredientname, quantity, units`,
        [ingredientname, quantity, units, ingredientId]
    );
    return rows[0];
}