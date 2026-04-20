import pool from "@/lib/db";
import { OrderItem } from "@/lib/types";

export async function submitOrder(
  items: OrderItem[],
  total: number,
  source: string = "kiosk",
  customerName: string | null = null,
  employeeId: number | null = null
): Promise<string> {
  const orderDetails = JSON.stringify({ items });
  //query the database
  const { rows } = await pool.query(
    `INSERT INTO orderhistory (orderid, time, orderdetails, price, employeeid, status, source, customer_name)
     VALUES (gen_random_uuid(), NOW(), $1::jsonb, $2, $3, 'pending', $4, $5)
     RETURNING orderid`,
    [orderDetails, total, employeeId, source, customerName]
  );
  return rows[0].orderid;
}
