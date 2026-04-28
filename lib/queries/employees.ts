import pool from "@/lib/db";

// Represents a row from the employees table.
export interface EmployeeRecord {
    employeeid: number;
    name: string;
    access: string; // e.g. "manager" or "employee"
    age: number;
    phone: string;
    email: string | null;
}

// Fetches all employees from the database, ordered by employeeid.
export async function getEmployees(): Promise<EmployeeRecord[]> {
    const { rows } = await pool.query(
        "SELECT employeeid, name, access, age, phone, email FROM employees ORDER BY employeeid"
    );
    return rows;
}

// Inserts a new employee into the database and returns the created record.
// Note: the password is stored as provided (hashing should be handled before calling this).
export async function addEmployee(
    name: string,
    access: string,
    age: number,
    phone: string,
    password: string,
    email: string
): Promise<EmployeeRecord> {
    const { rows } = await pool.query(
        "INSERT INTO employees (name, access, age, phone, password, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING employeeid, name, access, age, phone, email",
        [name, access, age, phone, password, email]
    );
    return rows[0];
}

// Deletes an employee by their ID. Does nothing if the ID doesn't exist.
export async function deleteEmployee(employeeId: number): Promise<void> {
    await pool.query("DELETE FROM employees WHERE employeeid = $1", [employeeId]);
}
