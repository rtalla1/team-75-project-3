"use client";

import { useEffect, useState } from "react";

interface Employee {
    id: number;
    name: string;
    role: string;
    age: number;
    phone: string;
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
    age: number;
    phone: string;
    email: string | null;
}

interface InventoryApiItem {
    ingredientid: number;
    ingredientname: string;
    quantity: number;
    units: string;
}

interface MenuApiItem {
    itemid: number;
    itemname: string;
    category: string;
    price: number;
    description: string;
}

export default function ManagerTerminal() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [menuItems, setMenuItems] = useState<ManagerMenuItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [employeeName, setEmployeeName] = useState("");
    const [employeeRole, setEmployeeRole] = useState("");
    const [employeeAge, setEmployeeAge] = useState("");
    const [employeePhone, setEmployeePhone] = useState("");
    const [employeePassword, setEmployeePassword] = useState("");
    const [employeeEmail, setEmployeeEmail] = useState("");

    const [inventoryName, setInventoryName] = useState("");
    const [inventoryQty, setInventoryQty] = useState("");
    const [inventoryUnits, setInventoryUnits] = useState("");

    const [menuName, setMenuName] = useState("");
    const [menuCategory, setMenuCategory] = useState("");
    const [menuPrice, setMenuPrice] = useState("");
    const [menuDescription, setMenuDescription] = useState("");

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
                    age: Number(e.age),
                    phone: e.phone,
                    email: e.email,
                }))
            );

            setInventory(
                inventoryData.map((item) => ({
                    id: item.ingredientid,
                    name: item.ingredientname,
                    quantity: Number(item.quantity),
                    unit: item.units,
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
        const age = Number(employeeAge);
        const phone = employeePhone.trim();
        const password = employeePassword.trim();
        const email = employeeEmail.trim();
        if (!name || !role || Number.isNaN(age) || age <= 0 || !phone || !password || !email) return;

        try {
            const res = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, access: role, age, phone, password, email }),
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
                    age: Number(created.age),
                    phone: created.phone,
                    email: created.email,
                },
            ]);
            setEmployeeName("");
            setEmployeeRole("");
            setEmployeeAge("");
            setEmployeePhone("");
            setEmployeePassword("");
            setEmployeeEmail("");
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add employee.";
            setError(message);
        }
    }

    async function addInventoryItem() {
        const name = inventoryName.trim();
        const units = inventoryUnits.trim();
        const quantity = Number(inventoryQty);
        if (!name || !units || Number.isNaN(quantity) || quantity < 0) return;

        try {
            const res = await fetch("/api/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ingredientname: name, quantity, units }),
            });

            if (!res.ok) {
                throw new Error("Failed to add inventory item");
            }

            const created = (await res.json()) as InventoryApiItem;
            setInventory((prev) => [
                ...prev,
                {
                    id: created.ingredientid,
                    name: created.ingredientname,
                    quantity: Number(created.quantity),
                    unit: created.units,
                },
            ]);
            setInventoryName("");
            setInventoryQty("");
            setInventoryUnits("");
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
        const description = menuDescription.trim();
        if (!name || !category || Number.isNaN(price) || price < 0 || !description) return;

        try {
            const res = await fetch("/api/menu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemname: name, category, price, description }),
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
            setMenuDescription("");
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
            const res = await fetch(`/api/inventory?ingredientId=${id}`, { method: "DELETE" });
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
                            type="number"
                            min="1"
                            value={employeeAge}
                            onChange={(e) => setEmployeeAge(e.target.value)}
                            placeholder="Age"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <input
                            value={employeePhone}
                            onChange={(e) => setEmployeePhone(e.target.value)}
                            placeholder="Phone"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <input
                            type="password"
                            value={employeePassword}
                            onChange={(e) => setEmployeePassword(e.target.value)}
                            placeholder="Password"
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
                                    <p className="text-xs text-muted">{employee.role} • Age {employee.age}</p>
                                    <p className="text-xs text-muted">{employee.phone}</p>
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
                            value={inventoryUnits}
                            onChange={(e) => setInventoryUnits(e.target.value)}
                            placeholder="Units (bags, gallons, etc.)"
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
                        <input
                            value={menuDescription}
                            onChange={(e) => setMenuDescription(e.target.value)}
                            placeholder="Description"
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