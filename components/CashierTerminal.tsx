"use client";

import { useState, useEffect } from "react";

interface MenuItem {
  itemid: number;
  itemname: string;
  category: string;
  price: number;
  description: string;
}

interface CartItem {
  item: string;
  price: number;
  addOns: string[];
}

const CATEGORIES = ["Classic Drink", "Fruit Drink", "Food"];
const TEMP_OPTIONS = ["Hot"];
const SUGAR_OPTIONS = ["100%", "75%", "50%", "25%", "0%"];

export default function CashierTerminal() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [addOns, setAddOns] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Modal state
  const [customizing, setCustomizing] = useState<MenuItem | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMenu(data.filter((i: MenuItem) => i.category !== "Add-on"));
          setAddOns(data.filter((i: MenuItem) => i.category === "Add-on"));
        } else {
          console.error("Menu API error:", data);
        }
      })
      .catch((err) => console.error("Failed to fetch menu:", err));
  }, []);

  const filtered = menu.filter((i) => i.category === activeCategory);
  const total = cart.reduce((s, i) => s + i.price, 0);

  function handleItemClick(item: MenuItem) {
    if (item.category === "Food") {
      setCart([...cart, { item: item.itemname, price: Number(item.price), addOns: [] }]);
    } else {
      setCustomizing(item);
      setSelectedAddOns([]);
    }
  }

  function toggleExclusive(name: string, groupNames: string[]) {
    setSelectedAddOns((prev) => {
      const withoutGroup = prev.filter((a) => !groupNames.includes(a));
      return prev.includes(name) ? withoutGroup : [...withoutGroup, name];
    });
  }

  function toggleAddOn(name: string) {
    setSelectedAddOns((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  function confirmCustomization() {
    if (!customizing) return;
    const addOnTotal = selectedAddOns.reduce((sum, name) => {
      const a = addOns.find((ao) => ao.itemname === name);
      return sum + (a ? Number(a.price) : 0);
    }, 0);
    setCart([
      ...cart,
      {
        item: customizing.itemname,
        price: Number(customizing.price) + addOnTotal,
        addOns: selectedAddOns,
      },
    ]);
    setCustomizing(null);
  }

  async function placeOrder() {
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, total, source: "cashier" }),
    });
    setCart([]);
    setOrderPlaced(true);
  }

  if (orderPlaced) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-2">Order placed</h1>
        <button
          onClick={() => setOrderPlaced(false)}
          className="rounded-lg bg-accent px-6 py-2 text-white font-medium hover:opacity-90 transition"
        >
          New Order
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col lg:flex-row">
      {/* Menu */}
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-display tracking-tight mb-6">Taro Root</h1>

        <div className="flex gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeCategory === cat
                  ? "bg-accent text-white"
                  : "bg-card border border-border text-muted hover:border-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <button
              key={item.itemid}
              onClick={() => handleItemClick(item)}
              className="text-left rounded-xl border border-border bg-card p-4 hover:border-accent hover:shadow-sm transition"
            >
              <div className="font-display font-bold">{item.itemname}</div>
              <div className="text-sm text-muted mt-1">${Number(item.price).toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-border bg-card p-6 flex flex-col">
        <h2 className="font-bold text-lg mb-4">Your Order</h2>

        {cart.length === 0 ? (
          <p className="text-muted text-sm flex-1">No items added yet.</p>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto">
            {cart.map((item, i) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between items-center">
                  <span>{item.item}</span>
                  <div className="flex items-center gap-2 text-muted">
                    <span>${item.price.toFixed(2)}</span>
                    <button
                      onClick={() => setCart(cart.filter((_, j) => j !== i))}
                      className="hover:text-red-500 transition"
                      aria-label={`Remove ${item.item}`}
                    >
                      x
                    </button>
                  </div>
                </div>
                {item.addOns.length > 0 && (
                  <p className="text-xs text-muted ml-2">+ {item.addOns.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex justify-between font-bold mb-3">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={cart.length === 0}
            className="w-full rounded-lg bg-accent py-2.5 text-white font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Place Order
          </button>
        </div>
      </div>

      {/* Customization modal */}
      {customizing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setCustomizing(null)}
        >
          <div
            className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-lg overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold font-display mb-1">{customizing.itemname}</h3>
            <p className="text-sm text-muted mb-1">{customizing.description}</p>
            <p className="text-sm text-muted mb-5">${Number(customizing.price).toFixed(2)}</p>

            {/* Temperature */}
            {customizing.category === "Classic Drink" && (
              <>
              <p className="text-sm font-medium mb-2">Temperature</p>
              <div className="flex gap-2 mb-5">
                <button
                  key="Hot"
                  onClick={() => toggleAddOn("Hot")}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                    selectedAddOns.includes("Hot")
                      ? "border-accent bg-accent-light text-accent"
                      : "border-border text-muted hover:border-accent"
                  }`}
                >
                  {"Hot"}
                </button>
              </div>
              </>
            )}

            {/* Sugar level */}
            <p className="text-sm font-medium mb-2">Sugar level</p>
            <div className="flex gap-2 mb-5">
              {SUGAR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleExclusive(opt, SUGAR_OPTIONS)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                    selectedAddOns.includes(opt)
                      ? "border-accent bg-accent-light text-accent"
                      : "border-border text-muted hover:border-accent"
                  }`}
                >
                  {opt.replace("Sugar ", "")}
                </button>
              ))}
            </div>

            {/* Toppings */}
            <p className="text-sm font-medium mb-2">Add toppings</p>
            <div className="space-y-2 mb-6">
              {addOns
                .filter((ao) => !TEMP_OPTIONS.includes(ao.itemname) && !SUGAR_OPTIONS.includes(ao.itemname))
                .map((ao) => (
                  <button
                    key={ao.itemid}
                    onClick={() => toggleAddOn(ao.itemname)}
                    className={`w-full flex justify-between items-center rounded-lg border p-3 text-sm transition ${
                      selectedAddOns.includes(ao.itemname)
                        ? "border-accent bg-accent-light"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    <span>{ao.itemname}</span>
                    <span className="text-muted">+${Number(ao.price).toFixed(2)}</span>
                  </button>
                ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCustomizing(null)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-background transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmCustomization}
                className="flex-1 rounded-lg bg-accent py-2 text-white text-sm font-medium hover:opacity-90 transition"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
