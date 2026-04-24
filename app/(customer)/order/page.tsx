"use client";

import { useState, useEffect, useRef } from "react";
import GoogleTranslate from "@/components/GoogleTranslate";

interface MenuItem {
  itemid: number;
  itemname: string;
  category: string;
  price: number;
  description: string;
}

interface CartItem {
  id: string;
  item: string;
  price: number;
  addOns: string[];
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// New interface for the weather data
interface WeatherData {
  temperature_2m: number;
  cloud_cover: number;
  wind_speed_10m: number;
  precipitation: number;
}

const CATEGORIES = ["Classic Drink", "Fruit Drink", "Food"];
const SUGAR_OPTIONS = ["120%", "100%", "75%", "50%", "25%", "0%"];

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}

export default function CustomerPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [addOns, setAddOns] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [customizing, setCustomizing] = useState<MenuItem | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  function showToast(message: string) {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToast({ id: Date.now(), message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 1800);
  }

  // New state for weather
  const [weather, setWeather] = useState<WeatherData | null>(null);
  // Helper for updating the weather
  const fetchWeather = async () => {
    try {
      const res = await fetch("/api/weather");
      const data = await res.json();
      if (!res.ok) return;
      setWeather(data);
    } catch (err) {
      console.error("Weather fetch failed:", err);
    }
  };


  useEffect(() => {
    // Fetch Menu
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMenu(data.filter((i: MenuItem) => i.category !== "Add-on"));
          setAddOns(data.filter((i: MenuItem) => i.category === "Add-on"));
        }
      });

    // Initial weather fetch
    fetchWeather();
  }, []);

  const filtered = menu.filter((i) => i.category === activeCategory);
  const total = cart.reduce((s, i) => s + i.price, 0);

  function handleItemClick(item: MenuItem) {
    if (item.category === "Food") {
      setCart((prev) => [
        ...prev,
        { id: newId(), item: item.itemname, price: Number(item.price), addOns: [] },
      ]);
      showToast(`${item.itemname} added to cart`);
    } else {
      setCustomizing(item);
      setSelectedAddOns([]);
    }
  }

  function openRecommendation() {
    const name = getWeatherRecommendation();
    const item = menu.find((m) => m.itemname === name);
    if (item) handleItemClick(item);
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
    const base = {
      item: customizing.itemname,
      price: Number(customizing.price) + addOnTotal,
      addOns: selectedAddOns,
    };

    if (editingId !== null) {
      setCart((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...base } : c)));
      showToast(`${customizing.itemname} updated`);
    } else {
      setCart((prev) => [...prev, { id: newId(), ...base }]);
      showToast(`${customizing.itemname} added to cart`);
    }
    closeCustomizing();
  }

  function closeCustomizing() {
    setCustomizing(null);
    setEditingId(null);
    setSelectedAddOns([]);
  }

  function startEditing(cartItem: CartItem) {
    const menuItem = menu.find((m) => m.itemname === cartItem.item);
    if (!menuItem || menuItem.category === "Food") return;
    setCustomizing(menuItem);
    setSelectedAddOns(cartItem.addOns);
    setEditingId(cartItem.id);
  }

  function isCustomizable(itemName: string) {
    const menuItem = menu.find((m) => m.itemname === itemName);
    return menuItem && menuItem.category !== "Food";
  }

  function getWeatherRecommendation() {
    if (!weather) return "Classic Milk Tea";
    else if (weather.temperature_2m >= 90) return "Strawberry Smoothie";
    else if (weather.temperature_2m < 50) return "Hot Honey Milk Tea";
    else if (weather.precipitation > 0.1) return "Hokkaido Milk Tea";
    else if (weather.cloud_cover >= 40 && weather.precipitation <= 0.1) {
      return "Wintermelon Milk Tea";
    }
    else if (weather.temperature_2m >= 80) return "Mango Green Tea";
    return "Classic Milk Tea";
  }

  async function placeOrder() {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, total, source: "kiosk" }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);

      setCart([]);
      setCartOpen(false);
      await fetchWeather();
      setOrderPlaced(true);
    } catch (err) {
      console.error("Failed to place order:", err);
      showToast("Could not place order. Please try again.");
    }
  }

  if (orderPlaced) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-2">Order placed</h1>
        <p className="text-muted mb-6">Thank you for your order.</p>
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
    <main className="flex-1 flex flex-col relative h-screen">

      <div className="relative flex items-center justify-center py-4 border-b border-border bg-card">
        <h1 className="text-3xl font-display tracking-tight">Taro Root</h1>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <GoogleTranslate />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Updated Sidebar with Weather at the bottom */}
        <div className="w-44 flex flex-col gap-2 p-4 border-r border-border bg-card">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-3 rounded-lg text-base font-medium text-center whitespace-nowrap transition ${
                activeCategory === cat
                  ? "bg-accent text-white"
                  : "border border-border text-muted hover:border-accent"
              }`}
            >
              {cat}
            </button>
          ))}

          {/* Weather Widget Container */}
          <div className="mt-auto pt-4 border-t border-border flex flex-col gap-1 text-xs text-muted uppercase tracking-wider">
            {weather ? (
              <>
                <div className="text-foreground font-bold text-xl leading-none">
                  {weather.temperature_2m.toFixed(0)}°F
                </div>
                <div>{weather.cloud_cover > 50 ? "Cloudy" : "Clear"}</div>
                <div>Wind: {weather.wind_speed_10m} mph</div>
                {weather.precipitation > 0 && (
                  <div className="text-accent font-medium">Rain: {weather.precipitation}"</div>
                )}

                {/* Recommendation Text */}
                <button
                  onClick={openRecommendation}
                  className="text-left mt-3 pt-3 border-t border-border/50 font-semibold normal-case leading-tight hover:text-accent transition"
                >
                  Try our <span className="text-foreground not-italic underline underline-offset-2 hover:text-accent">{getWeatherRecommendation()}</span>
                </button>
              </>
            ) : (
              <div className="animate-pulse">Loading...</div>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((item) => (
              <button
                key={item.itemid}
                onClick={() => handleItemClick(item)}
                className="text-left rounded-xl border border-border bg-card p-4 hover:border-accent hover:shadow-sm transition"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-display font-bold text-lg leading-tight">{item.itemname}</div>
                  <div className="text-base text-muted shrink-0">${Number(item.price).toFixed(2)}</div>
                </div>
                {item.description && (
                  <div className="text-sm text-muted mt-2 leading-snug">{item.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating cart button */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-white font-medium shadow-md hover:opacity-90 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        Cart
        {cart.length > 0 && (
          <span className="bg-white text-accent text-xs rounded-full px-2 py-0.5 font-medium">
            {cart.length}
          </span>
        )}
      </button>

      {/* Cart drawer overlay */}
      {cartOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setCartOpen(false)} />}

      <div className={`fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 flex flex-col p-6 transition-transform duration-200 ${cartOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Your Order</h2>
          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-sm text-muted text-red-500 transition hover:underline"
              >
                Clear all
              </button>
            )}
            <button onClick={() => setCartOpen(false)} className="text-muted hover:text-foreground transition text-xl" aria-label="Close cart">✕</button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-muted text-sm">No items added yet.</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="border border-border rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium">{item.item}</div>
                  <div className="text-muted shrink-0">${item.price.toFixed(2)}</div>
                </div>
                {item.addOns.length > 0 && (
                  <div className="text-xs text-muted mt-1">{item.addOns.join(", ")}</div>
                )}
                <div className="flex gap-2 mt-2">
                  {isCustomizable(item.item) && (
                    <button
                      onClick={() => startEditing(item)}
                      className="text-xs text-accent hover:underline"
                    >
                      Customize
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setCart((prev) => prev.filter((c) => c.id !== item.id));
                      showToast(`${item.item} removed from cart`);
                    }}
                    className="text-xs text-muted hover:underline text-red-500 ml-auto"
                    aria-label={`Remove ${item.item}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex justify-between font-bold mb-3">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button onClick={placeOrder} disabled={cart.length === 0} className="w-full rounded-lg bg-accent py-2.5 text-white disabled:opacity-40">Place Order</button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          style={{ animation: "toast-life 1800ms forwards" }}
          className="fixed bottom-24 left-1/2 z-50 rounded-full bg-foreground text-background px-5 py-3 text-base shadow-lg"
        >
          {toast.message}
        </div>
      )}

      {/* Customization modal */}
      {customizing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={closeCustomizing}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Customize ${customizing.itemname}`}
            className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-1">{customizing.itemname}</h3>
            {customizing.description && (
              <p className="text-sm text-muted mb-2">{customizing.description}</p>
            )}
            <p className="text-base text-muted mb-5">${Number(customizing.price).toFixed(2)}</p>

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

            {/* Sugar levels */}
            <p className="text-sm font-medium mb-2">Sugar Level</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {SUGAR_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleExclusive(s, SUGAR_OPTIONS)}
                  className={`rounded-lg border py-2 text-sm transition ${
                    selectedAddOns.includes(s)
                      ? "border-accent bg-accent-light"
                      : "border-border hover:border-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium mb-2">Toppings</p>
            <div className="space-y-2 mb-6">
              {addOns.map((ao) => (
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
                onClick={closeCustomizing}
                className="flex-1 rounded-lg border border-border py-2 font-medium hover:bg-background transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmCustomization}
                className="flex-1 rounded-lg bg-accent py-2 text-white font-medium hover:opacity-90 transition"
              >
                {editingId !== null ? "Save Changes" : "Add to Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}