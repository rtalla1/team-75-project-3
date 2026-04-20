"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

interface IngredientMappingInput {
    ingredientid: number;
    quantity: number;
}

type ModalType = "employee" | "inventory" | "menu" | null;

export default function ManagerTerminal() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [menuItems, setMenuItems] = useState<ManagerMenuItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    //field for adding employees, inventory, and menu items
    const [employeeForm, setEmployeeForm] = useState({
        name: "",
        access: "",
        age: "",
        phone: "",
        password: "",
        email: "",
    });

    const [inventoryForm, setInventoryForm] = useState({
        ingredientname: "",
        quantity: "",
        units: "",
    });

    const [menuForm, setMenuForm] = useState({
        itemname: "",
        category: "",
        price: "",
        description: "",
    });
    const [menuIngredientRows, setMenuIngredientRows] = useState<Array<{ ingredientid: string; quantity: string }>>([
        { ingredientid: "", quantity: "" },
    ]);

    useEffect(() => {
        void loadData();
    }, []);

    //populate data from database
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

    function openModal(type: Exclude<ModalType, null>) {
        setError(null);
        setActiveModal(type);
    }

    function closeModal() {
        setActiveModal(null);
    }

    async function addEmployeeFromModal() {
        const name = employeeForm.name.trim();
        const access = employeeForm.access.trim();
        const age = Number(employeeForm.age);
        const phone = employeeForm.phone.trim();
        const password = employeeForm.password.trim();
        const email = employeeForm.email.trim();

        if (!name || !access || !phone || !password || !email || Number.isNaN(age) || age <= 0) {
            setError("Please fill all employee fields with valid values.");
            return;
        }



        try {
            const res = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, access, age, phone, password, email }),
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
            setEmployeeForm({ name: "", access: "", age: "", phone: "", password: "", email: "" });
            closeModal();
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add employee.";
            setError(message);
        }
    }

    async function addInventoryFromModal() {
        const ingredientname = inventoryForm.ingredientname.trim();
        const units = inventoryForm.units.trim();
        const quantity = Number(inventoryForm.quantity);

        if (!ingredientname || !units || Number.isNaN(quantity) || quantity < 0) {
            setError("Please fill all inventory fields with valid values.");
            return;
        }

        try {
            const res = await fetch("/api/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ingredientname, quantity, units }),
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
            setInventoryForm({ ingredientname: "", quantity: "", units: "" });
            closeModal();
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add inventory item.";
            setError(message);
        }
    }

    async function addMenuFromModal() {
        const itemname = menuForm.itemname.trim();
        const category = menuForm.category.trim();
        const price = Number(menuForm.price);
        const description = menuForm.description.trim();

        if (!itemname || !category || !description || Number.isNaN(price) || price < 0) {
            setError("Please fill all menu fields with valid values.");
            return;
        }

        //mapping new menu items to ingredients for automatically updating inventory
        const ingredientMappings: IngredientMappingInput[] = [];
        for (const row of menuIngredientRows) {
            const ingredientid = Number(row.ingredientid);
            const quantity = Number(row.quantity);
            if (!Number.isInteger(ingredientid) || Number.isNaN(quantity) || quantity <= 0) {
                setError("Each ingredient mapping row needs a valid ingredient and quantity > 0.");
                return;
            }
            ingredientMappings.push({ ingredientid, quantity });
        }

        if (ingredientMappings.length === 0) {
            setError("At least one ingredient mapping is required.");
            return;
        }

        try {
            const res = await fetch("/api/menu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemname, category, price, description, ingredientMappings }),
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
            setMenuForm({ itemname: "", category: "", price: "", description: "" });
            setMenuIngredientRows([{ ingredientid: "", quantity: "" }]);
            closeModal();
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add menu item.";
            setError(message);
        }
    }

    function addIngredientRow() {
        setMenuIngredientRows((prev) => [...prev, { ingredientid: "", quantity: "" }]);
    }

    function updateIngredientRow(index: number, field: "ingredientid" | "quantity", value: string) {
        setMenuIngredientRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    }

    function removeIngredientRow(index: number) {
        setMenuIngredientRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    }

    //removing employees, inventory, and menu items
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
            <h1 className="text-3xl font-display tracking-tight mb-6">Taro Root</h1>

            <div className="mb-4 flex items-center gap-4">
                {loading && <p className="text-sm text-muted">Loading manager data...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                    onClick={loadData}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent transition"
                >
                    Refresh
                </button>

                <Link
                    href="/manager/stats"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition"
                >
                    View Statistics
                </Link>
            </div>

             {/* creating ui from modals*/}
            <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-xl border border-border bg-card p-4 flex flex-col">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-xl font-bold">Employees</h2>
                        <button
                            onClick={() => openModal("employee")}
                            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
                        >
                            Edit
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
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-xl font-bold">Inventory Items</h2>
                        <button
                            onClick={() => openModal("inventory")}
                            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
                        >
                            Edit
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
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-xl font-bold">Menu Items</h2>
                        <button
                            onClick={() => openModal("menu")}
                            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
                        >
                            Edit
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

            {activeModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg">
                        {activeModal === "employee" && (
                            <>
                                <h3 className="text-lg font-bold mb-4">Add Employee</h3>
                                <div className="grid gap-2">
                                    <input
                                        value={employeeForm.name}
                                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="Name"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        value={employeeForm.access}
                                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, access: e.target.value }))}
                                        placeholder="Access role"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        value={employeeForm.age}
                                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, age: e.target.value }))}
                                        placeholder="Age"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        value={employeeForm.phone}
                                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Phone"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="password"
                                        value={employeeForm.password}
                                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, password: e.target.value }))}
                                        placeholder="Password"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="email"
                                        value={employeeForm.email}
                                        onChange={(e) => setEmployeeForm((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder="Email"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={closeModal}
                                        className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => void addEmployeeFromModal()}
                                        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                                    >
                                        Save
                                    </button>
                                </div>
                            </>
                        )}

                        {activeModal === "inventory" && (
                            <>
                                <h3 className="text-lg font-bold mb-4">Add Inventory Item</h3>
                                <div className="grid gap-2">
                                    <input
                                        value={inventoryForm.ingredientname}
                                        onChange={(e) => setInventoryForm((prev) => ({ ...prev, ingredientname: e.target.value }))}
                                        placeholder="Ingredient name"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        value={inventoryForm.quantity}
                                        onChange={(e) => setInventoryForm((prev) => ({ ...prev, quantity: e.target.value }))}
                                        placeholder="Quantity"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        value={inventoryForm.units}
                                        onChange={(e) => setInventoryForm((prev) => ({ ...prev, units: e.target.value }))}
                                        placeholder="Units"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={closeModal}
                                        className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => void addInventoryFromModal()}
                                        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                                    >
                                        Save
                                    </button>
                                </div>
                            </>
                        )}

                        {activeModal === "menu" && (
                            <>
                                <h3 className="text-lg font-bold mb-4">Add Menu Item</h3>
                                <div className="grid gap-2 mb-3">
                                    <input
                                        value={menuForm.itemname}
                                        onChange={(e) => setMenuForm((prev) => ({ ...prev, itemname: e.target.value }))}
                                        placeholder="Item name"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        value={menuForm.category}
                                        onChange={(e) => setMenuForm((prev) => ({ ...prev, category: e.target.value }))}
                                        placeholder="Category"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={menuForm.price}
                                        onChange={(e) => setMenuForm((prev) => ({ ...prev, price: e.target.value }))}
                                        placeholder="Price"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                    <textarea
                                        value={menuForm.description}
                                        onChange={(e) => setMenuForm((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Description"
                                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />
                                </div>

                                <p className="text-sm font-medium mb-2">Ingredient mappings</p>
                                <div className="space-y-2 max-h-44 overflow-y-auto">
                                    {menuIngredientRows.map((row, index) => (
                                        <div key={index} className="grid grid-cols-[1fr_120px_auto] gap-2">
                                            <select
                                                value={row.ingredientid}
                                                onChange={(e) => updateIngredientRow(index, "ingredientid", e.target.value)}
                                                className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
                                            >
                                                <option value="">Select ingredient</option>
                                                {inventory.map((ing) => (
                                                    <option key={ing.id} value={ing.id}>
                                                        {ing.id} - {ing.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={row.quantity}
                                                onChange={(e) => updateIngredientRow(index, "quantity", e.target.value)}
                                                placeholder="Quantity"
                                                className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
                                            />
                                            <button
                                                onClick={() => removeIngredientRow(index)}
                                                className="rounded-lg border border-border px-2 text-xs hover:bg-background"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={addIngredientRow}
                                    className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-background"
                                >
                                    Add ingredient row
                                </button>

                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        onClick={closeModal}
                                        className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => void addMenuFromModal()}
                                        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                                    >
                                        Save
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}