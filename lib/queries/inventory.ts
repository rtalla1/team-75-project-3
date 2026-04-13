import pool from "@/lib/db";

export interface InventoryRecord {
    inventoryid: number;
    itemname: string;
    quantity: number;
    unit: string;
}

export async function getInventory(): Promise<InventoryRecord[]> {
    const { rows } = await pool.query(
        "SELECT inventoryid, itemname, quantity, unit FROM inventory ORDER BY inventoryid"
    );
    return rows;
}

export async function addInventoryItem(
    itemName: string,
    quantity: number,
    unit: string
): Promise<InventoryRecord> {
    const { rows } = await pool.query(
        "INSERT INTO inventory (itemname, quantity, unit) VALUES ($1, $2, $3) RETURNING inventoryid, itemname, quantity, unit",
        [itemName, quantity, unit]
    );
    return rows[0];
}

export async function deleteInventoryItem(inventoryId: number): Promise<void> {
    await pool.query("DELETE FROM inventory WHERE inventoryid = $1", [inventoryId]);
}
