"use client";

import { useEffect, useState } from "react";

interface Employee {
    id: number;
    name: string;
    role: string;
    email: string | null;
}

interface InventoryItem {
    id: number;
    name: string;
    quantity: number;
    unit: string;
}

interface ManagerMenuItem {
    id: number;
    name: string;
    category: string;
    price: number;
}

interface EmployeeApiItem {
    employeeid: number;
    name: string;
    access: string;
    email: string | null;
}

interface InventoryApiItem {
    inventoryid: number;
    itemname: string;
    quantity: number;
    unit: string;
}

interface MenuApiItem {
    itemid: number;
    itemname: string;
    category: string;
    price: number;
}

export default function ManagerTerminal() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [menuItems, setMenuItems] = useState<ManagerMenuItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [employeeName, setEmployeeName] = useState("");
    const [employeeRole, setEmployeeRole] = useState("");
    const [employeeEmail, setEmployeeEmail] = useState("");

    const [inventoryName, setInventoryName] = useState("");
    const [inventoryQty, setInventoryQty] = useState("");
    const [inventoryUnit, setInventoryUnit] = useState("");

    const [menuName, setMenuName] = useState("");
    const [menuCategory, setMenuCategory] = useState("");
    const [menuPrice, setMenuPrice] = useState("");

    useEffect(() => {
        void loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            const [employeesRes, inventoryRes, menuRes] = await Promise.all([
                fetch("/api/employees"),
                fetch("/api/inventory"),
                fetch("/api/menu"),
            ]);

            if (!employeesRes.ok || !inventoryRes.ok || !menuRes.ok) {
                throw new Error("Failed to fetch manager data.");
            }

            const employeesData = (await employeesRes.json()) as EmployeeApiItem[];
            const inventoryData = (await inventoryRes.json()) as InventoryApiItem[];
            const menuData = (await menuRes.json()) as MenuApiItem[];

            setEmployees(
                employeesData.map((e) => ({
                    id: e.employeeid,
                    name: e.name,
                    role: e.access,
                    email: e.email,
                }))
            );

            setInventory(
                inventoryData.map((item) => ({
                    id: item.inventoryid,
                    name: item.itemname,
                    quantity: Number(item.quantity),
                    unit: item.unit,
                }))
            );

            setMenuItems(
                menuData.map((item) => ({
                    id: item.itemid,
                    name: item.itemname,
                    category: item.category,
                    price: Number(item.price),
                }))
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load manager data.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    async function addEmployee() {
        const name = employeeName.trim();
        const role = employeeRole.trim();
        const email = employeeEmail.trim();
        if (!name || !role || !email) return;

        try {
            const res = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, access: role, email }),
            });

            if (!res.ok) {
                throw new Error("Failed to add employee");
            }

            const created = (await res.json()) as EmployeeApiItem;
            setEmployees((prev) => [
                ...prev,
                {
                    id: created.employeeid,
                    name: created.name,
                    role: created.access,
                    email: created.email,
                },
            ]);
            setEmployeeName("");
            setEmployeeRole("");
            setEmployeeEmail("");
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add employee.";
            setError(message);
        }
    }

    async function addInventoryItem() {
        const name = inventoryName.trim();
        const unit = inventoryUnit.trim();
        const quantity = Number(inventoryQty);
        if (!name || !unit || Number.isNaN(quantity) || quantity < 0) return;

        try {
            const res = await fetch("/api/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemname: name, quantity, unit }),
            });

            if (!res.ok) {
                throw new Error("Failed to add inventory item");
            }

            const created = (await res.json()) as InventoryApiItem;
            setInventory((prev) => [
                ...prev,
                {
                    id: created.inventoryid,
                    name: created.itemname,
                    quantity: Number(created.quantity),
                    unit: created.unit,
                },
            ]);
            setInventoryName("");
            setInventoryQty("");
            setInventoryUnit("");
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add inventory item.";
            setError(message);
        }
    }

    async function addMenuItem() {
        const name = menuName.trim();
        const category = menuCategory.trim();
        const price = Number(menuPrice);
        if (!name || !category || Number.isNaN(price) || price < 0) return;

        try {
            const res = await fetch("/api/menu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemname: name, category, price, description: "" }),
            });

            if (!res.ok) {
                throw new Error("Failed to add menu item");
            }

            const created = (await res.json()) as MenuApiItem;
            setMenuItems((prev) => [
                ...prev,
                {
                    id: created.itemid,
                    name: created.itemname,
                    category: created.category,
                    price: Number(created.price),
                },
            ]);
            setMenuName("");
            setMenuCategory("");
            setMenuPrice("");
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add menu item.";
            setError(message);
        }
    }

    async function deleteEmployeeById(id: number) {
        try {
            const res = await fetch(`/api/employees?employeeId=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete employee");
            setEmployees((prev) => prev.filter((e) => e.id !== id));
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete employee.";
            setError(message);
        }
    }

    async function deleteInventoryById(id: number) {
        try {
            const res = await fetch(`/api/inventory?inventoryId=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete inventory item");
            setInventory((prev) => prev.filter((i) => i.id !== id));
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete inventory item.";
            setError(message);
        }
    }

    async function deleteMenuById(id: number) {
        try {
            const res = await fetch(`/api/menu?itemId=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete menu item");
            setMenuItems((prev) => prev.filter((m) => m.id !== id));
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete menu item.";
            setError(message);
        }
    }

    return (
        <main className="flex-1 p-6 md:p-8">
            <h1 className="text-3xl font-display tracking-tight mb-6">Manager Terminal</h1>

            <div className="mb-4 flex items-center gap-4">
                {loading && <p className="text-sm text-muted">Loading manager data...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                    onClick={loadData}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent transition"
                >
                    Refresh
                </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-xl border border-border bg-card p-4 flex flex-col">
                    <h2 className="text-xl font-bold mb-3">Employees</h2>

                    <div className="grid gap-2 mb-4">
                        <input
                            value={employeeName}
                            onChange={(e) => setEmployeeName(e.target.value)}
                            placeholder="Employee name"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <input
                            value={employeeRole}
                            onChange={(e) => setEmployeeRole(e.target.value)}
                            placeholder="Role"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <input
                            type="email"
                            value={employeeEmail}
                            onChange={(e) => setEmployeeEmail(e.target.value)}
                            placeholder="Email"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <button
                            onClick={addEmployee}
                            className="rounded-lg bg-accent py-2 text-sm font-medium text-white hover:opacity-90 transition"
                        >
                            Add Employee
                        </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto">
                        {employees.map((employee) => (
                            <div
                                key={employee.id}
                                className="rounded-lg border border-border px-3 py-2 flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium">{employee.name}</p>
                                    <p className="text-xs text-muted">{employee.role}</p>
                                    <p className="text-xs text-muted">{employee.email ?? "No email"}</p>
                                </div>
                                <button
                                    onClick={() => void deleteEmployeeById(employee.id)}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-4 flex flex-col">
                    <h2 className="text-xl font-bold mb-3">Inventory Items</h2>

                    <div className="grid gap-2 mb-4">
                        <input
                            value={inventoryName}
                            onChange={(e) => setInventoryName(e.target.value)}
                            placeholder="Item name"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <input
                            type="number"
                            min="0"
                            value={inventoryQty}
                            onChange={(e) => setInventoryQty(e.target.value)}
                            placeholder="Quantity"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <input
                            value={inventoryUnit}
                            onChange={(e) => setInventoryUnit(e.target.value)}
                            placeholder="Unit (bags, gallons, etc.)"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <button
                            onClick={addInventoryItem}
                            className="rounded-lg bg-accent py-2 text-sm font-medium text-white hover:opacity-90 transition"
                        >
                            Add Inventory Item
                        </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto">
                        {inventory.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-lg border border-border px-3 py-2 flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="text-xs text-muted">
                                        {item.quantity} {item.unit}
                                    </p>
                                </div>
                                <button
                                    onClick={() => void deleteInventoryById(item.id)}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-4 flex flex-col">
                    <h2 className="text-xl font-bold mb-3">Menu Items</h2>

                    <div className="grid gap-2 mb-4">
                        <input
                            value={menuName}
                            onChange={(e) => setMenuName(e.target.value)}
                            placeholder="Menu item name"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <input
                            value={menuCategory}
                            onChange={(e) => setMenuCategory(e.target.value)}
                            placeholder="Category"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={menuPrice}
                            onChange={(e) => setMenuPrice(e.target.value)}
                            placeholder="Price"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <button
                            onClick={addMenuItem}
                            className="rounded-lg bg-accent py-2 text-sm font-medium text-white hover:opacity-90 transition"
                        >
                            Add Menu Item
                        </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto">
                        {menuItems.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-lg border border-border px-3 py-2 flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="text-xs text-muted">
                                        {item.category} • ${item.price.toFixed(2)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => void deleteMenuById(item.id)}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}