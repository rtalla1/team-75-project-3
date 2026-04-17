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

// New interface for the weather data
interface WeatherData {
  temperature_2m: number;
  cloud_cover: number;
  wind_speed_10m: number;
  precipitation: number;
}

const CATEGORIES = ["Classic Drink", "Fruit Drink", "Food"];
const SUGAR_OPTIONS = ["120%", "100%", "75%", "50%", "25%", "0%"];

export default function CustomerPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [addOns, setAddOns] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [customizing, setCustomizing] = useState<MenuItem | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  // New state for weather
  const [weather, setWeather] = useState<WeatherData | null>(null);
  // Helper for updating the weather
  const fetchWeather = async () => {
    try {
      const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=30.62&longitude=-96.325&current=temperature_2m,cloud_cover,wind_speed_10m,precipitation&timezone=America%2FChicago&wind_speed_unit=mph&temperature_unit=fahrenheit&precipitation_unit=inch");
      const data = await response.json();
      setWeather(data.current);
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
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, total, source: "kiosk" }),
    });
    
    // Clear the cart
    setCart([]);
    setCartOpen(false);
    //refresh the weather data
    await fetchWeather();
    setOrderPlaced(true);
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

      <div className="text-center py-4 border-b border-border bg-card">
        <h1 className="text-3xl font-display tracking-tight">Taro Root</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Updated Sidebar with Weather at the bottom */}
        <div className="w-32 flex flex-col gap-2 p-4 border-r border-border bg-card">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium text-center transition ${
                activeCategory === cat
                  ? "bg-accent text-white"
                  : "border border-border text-muted hover:border-accent"
              }`}
            >
              {cat}
            </button>
          ))}

          {/* Weather Widget Container */}
          <div className="mt-auto pt-4 border-t border-border flex flex-col gap-1 text-[10px] text-muted uppercase tracking-wider">
            {weather ? (
              <>
                <div className="text-foreground font-bold text-base leading-none">
                  {weather.temperature_2m.toFixed(0)}°F
                </div>
                <div>{weather.cloud_cover > 50 ? "Cloudy" : "Clear"}</div>
                <div>Wind: {weather.wind_speed_10m} mph</div>
                {weather.precipitation > 0 && (
                  <div className="text-accent font-medium">Rain: {weather.precipitation}"</div>
                )}

                {/* New Recommendation Text */}
                <div className="mt-3 pt-3 border-t border-border/50 font-semibold normal-case leading-tight">
                  Try our <span className="text-foreground not-italic">{getWeatherRecommendation()}</span>
                </div>
              </>
            ) : (
              <div className="animate-pulse">Loading...</div>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
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

      {/* Cart Drawer & Modals remain the same... */}
      {/* (Skipping identical modal code for brevity, ensure you keep your existing modal JSX here) */}
      
      {/* Cart drawer overlay */}
      {cartOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setCartOpen(false)} />}

      <div className={`fixed top-0 right-0 h-full w-72 bg-card border-l border-border z-50 flex flex-col p-6 transition-transform duration-200 ${cartOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Your Order</h2>
          <button onClick={() => setCartOpen(false)} className="text-muted hover:text-foreground transition text-xl">✕</button>
        </div>
        {/* Cart items list and place order button... */}
        <div className="flex-1 space-y-2 overflow-y-auto">
            {cart.map((item, i) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between items-center">
                  <span>{item.item}</span>
                  <div className="flex items-center gap-2 text-muted">
                    <span>${item.price.toFixed(2)}</span>
                    <button onClick={() => setCart(cart.filter((_, j) => j !== i))} className="hover:text-red-500">✕</button>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex justify-between font-bold mb-3">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button onClick={placeOrder} disabled={cart.length === 0} className="w-full rounded-lg bg-accent py-2.5 text-white disabled:opacity-40">Place Order</button>
        </div>
      </div>

      {/* Customization modal */}
      {customizing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setCustomizing(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">{customizing.itemname}</h3>
            <p className="text-sm text-muted mb-5">${Number(customizing.price).toFixed(2)}</p>
            {/* ... rest of your customization logic ... */}
            <div className="flex gap-3">
               <button onClick={() => setCustomizing(null)} className="flex-1 rounded-lg border py-2">Cancel</button>
               <button onClick={confirmCustomization} className="flex-1 rounded-lg bg-accent py-2 text-white">Add to Order</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}