"use client";

import { useState } from "react";

interface Employee {
    id: number;
    name: string;
    role: string;
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

const INITIAL_EMPLOYEES: Employee[] = [
    { id: 1, name: "Alex Kim", role: "Cashier" },
    { id: 2, name: "Jordan Lee", role: "Barista" },
    { id: 3, name: "Morgan Chen", role: "Shift Lead" },
];

const INITIAL_INVENTORY: InventoryItem[] = [
    { id: 1, name: "Taro Powder", quantity: 12, unit: "bags" },
    { id: 2, name: "Whole Milk", quantity: 18, unit: "gallons" },
    { id: 3, name: "Boba Pearls", quantity: 9, unit: "containers" },
];

const INITIAL_MENU: ManagerMenuItem[] = [
    { id: 1, name: "Classic Milk Tea", category: "Classic Drink", price: 5.5 },
    { id: 2, name: "Strawberry Fruit Tea", category: "Fruit Drink", price: 5.75 },
    { id: 3, name: "Popcorn Chicken", category: "Food", price: 6.95 },
];

function getNextId<T extends { id: number }>(items: T[]) {
    return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export default function ManagerTerminal() {
    const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
    const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
    const [menuItems, setMenuItems] = useState<ManagerMenuItem[]>(INITIAL_MENU);

    const [employeeName, setEmployeeName] = useState("");
    const [employeeRole, setEmployeeRole] = useState("");

    const [inventoryName, setInventoryName] = useState("");
    const [inventoryQty, setInventoryQty] = useState("");
    const [inventoryUnit, setInventoryUnit] = useState("");

    const [menuName, setMenuName] = useState("");
    const [menuCategory, setMenuCategory] = useState("");
    const [menuPrice, setMenuPrice] = useState("");

    function addEmployee() {
        const name = employeeName.trim();
        const role = employeeRole.trim();
        if (!name || !role) return;

        setEmployees((prev) => [...prev, { id: getNextId(prev), name, role }]);
        setEmployeeName("");
        setEmployeeRole("");
    }

    function addInventoryItem() {
        const name = inventoryName.trim();
        const unit = inventoryUnit.trim();
        const quantity = Number(inventoryQty);
        if (!name || !unit || Number.isNaN(quantity) || quantity < 0) return;

        setInventory((prev) => [...prev, { id: getNextId(prev), name, quantity, unit }]);
        setInventoryName("");
        setInventoryQty("");
        setInventoryUnit("");
    }

    function addMenuItem() {
        const name = menuName.trim();
        const category = menuCategory.trim();
        const price = Number(menuPrice);
        if (!name || !category || Number.isNaN(price) || price < 0) return;

        setMenuItems((prev) => [...prev, { id: getNextId(prev), name, category, price }]);
        setMenuName("");
        setMenuCategory("");
        setMenuPrice("");
    }

    return (
        <main className="flex-1 p-6 md:p-8">
            <h1 className="text-3xl font-display tracking-tight mb-6">Manager Terminal</h1>

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
                                </div>
                                <button
                                    onClick={() => setEmployees((prev) => prev.filter((e) => e.id !== employee.id))}
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
                                    onClick={() => setInventory((prev) => prev.filter((i) => i.id !== item.id))}
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
                                    onClick={() => setMenuItems((prev) => prev.filter((m) => m.id !== item.id))}
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