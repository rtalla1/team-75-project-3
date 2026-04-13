import pool from "@/lib/db";

export interface EmployeeRecord {
    employeeid: number;
    name: string;
    access: string;
    email: string | null;
}

export async function getEmployees(): Promise<EmployeeRecord[]> {
    const { rows } = await pool.query(
        "SELECT employeeid, name, access, email FROM employees ORDER BY employeeid"
    );
    return rows;
}

export async function addEmployee(name: string, access: string, email: string | null = null): Promise<EmployeeRecord> {
    const { rows } = await pool.query(
        "INSERT INTO employees (name, access, email) VALUES ($1, $2, $3) RETURNING employeeid, name, access, email",
        [name, access, email]
    );
    return rows[0];
}

export async function deleteEmployee(employeeId: number): Promise<void> {
    await pool.query("DELETE FROM employees WHERE employeeid = $1", [employeeId]);
}
