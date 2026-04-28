"use client";

import { useState, useEffect, useRef } from "react";
import GoogleTranslate from "@/components/GoogleTranslate";

import VirtualKeyboard from "@/components/VirtualKeyboard";
import type { KeyboardTheme, KeyboardLayout } from "@/components/VirtualKeyboard";


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

interface WeatherData {
  temperature_2m: number;
  cloud_cover: number;
  wind_speed_10m: number;
  precipitation: number;
}

interface ChatMessage {
  message: string,
  id: string
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const menuGridRef = useRef<HTMLDivElement>(null);
  const customizingRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const lastClickedItemRef = useRef<HTMLButtonElement>(null);

  function showToast(message: string) {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToast({ id: Date.now(), message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 1800);
  }

  const [weather, setWeather] = useState<WeatherData | null>(null);
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
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMenu(data.filter((i: MenuItem) => i.category !== "Add-on"));
          setAddOns(data.filter((i: MenuItem) => i.category === "Add-on"));
        }
      });

    fetchWeather();
  }, []);

  // Move focus to customization modal when it opens
  useEffect(() => {
    if (customizing) {
      focusCustomizationModal();
    }
  }, [customizing]);

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
    // Return focus to the item that was clicked
    setTimeout(() => {
      lastClickedItemRef.current?.focus();
    }, 0);
  }

  function focusFirstMenuItem() {
    setTimeout(() => {
      firstItemRef.current?.focus();
    }, 0);
  }

  function focusCustomizationModal() {
    setTimeout(() => {
      customizingRef.current?.querySelector("h3")?.focus();
    }, 0);
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

  return (
    <main className="flex-1 flex flex-col relative h-screen">

      {/* Header stays mounted at all times so GoogleTranslate is never torn down */}
      <div className="relative flex items-center justify-center py-4 border-b border-border bg-card">
        <h1 className="text-3xl font-display tracking-tight"><span translate="no">Taro Root</span></h1>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <GoogleTranslate />
        </div>
      </div>

      {/* Order confirmation — rendered in-place instead of as an early return */}
      {orderPlaced && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <h1 className="text-3xl font-bold mb-2"><span>Order placed</span></h1>
          <p className="text-muted mb-6"><span>Thank you for your order.</span></p>
          <button
            onClick={() => {
              setOrderPlaced(false);
              document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
              window.location.reload();
            }}
            className="rounded-lg bg-accent px-6 py-2 text-white font-medium hover:opacity-90 transition"
          >
            <span>New Order</span>
          </button>
        </div>
      )}

      {!orderPlaced && (
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <div className="w-44 flex flex-col gap-2 p-4 border-r border-border bg-card" role="navigation" aria-label="Category filters">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  focusFirstMenuItem();
                }}
                aria-label={`View ${cat} category`}
                aria-pressed={activeCategory === cat}
                className={`px-3 py-3 rounded-lg text-base font-medium text-center leading-tight transition ${activeCategory === cat
                    ? "bg-accent text-white"
                    : "border border-border text-muted hover:border-accent"
                  }`}
              >
                {/* Static category names don't need spans since they never change,
                  but wrapping them is harmless and consistent */}
                <span>{cat}</span>
              </button>
            ))}

            {/* Weather Widget */}
            <div className="mt-auto pt-4 border-t border-border flex flex-col gap-1 text-xs text-muted uppercase tracking-wider">
              {weather ? (
                <>
                  <div className="text-foreground font-bold text-xl leading-none">
                    <span translate="no">{weather.temperature_2m.toFixed(0)}°F</span>
                  </div>
                  <div><span>{weather.cloud_cover > 50 ? "Cloudy" : "Clear"}</span></div>
                  <div><span>Wind: <span translate="no">{weather.wind_speed_10m} mph</span></span></div>
                  {weather.precipitation > 0 && (
                    <div className="text-accent font-medium">
                      <span>Rain: <span translate="no">{weather.precipitation}"</span></span>
                    </div>
                  )}

                  <button
                    onClick={openRecommendation}
                    className="text-left mt-3 pt-3 border-t border-border/50 font-semibold normal-case leading-tight hover:text-accent transition"
                    aria-label={`Add recommended drink to cart: ${getWeatherRecommendation()}`}
                  >
                    <span>Try our </span>
                    <span className="text-foreground not-italic underline underline-offset-2 hover:text-accent">
                      {getWeatherRecommendation()}
                    </span>
                  </button>
                </>
              ) : (
                <div className="animate-pulse"><span>Loading...</span></div>
              )}
            </div>
          </div>

          {/* Menu grid */}
          <div className="flex-1 p-6 overflow-y-auto" role="main" aria-label="Menu items">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" ref={menuGridRef}>
              {filtered.map((item, index) => (
                <button
                  key={item.itemid}
                  ref={index === 0 ? firstItemRef : null}
                  onClick={(e) => {
                    lastClickedItemRef.current = e.currentTarget as HTMLButtonElement;
                    handleItemClick(item);
                  }}
                  aria-label={`${item.itemname}, $${Number(item.price).toFixed(2)}${item.description ? `. ${item.description}` : ""}`}
                  className="text-left rounded-xl border border-border bg-card p-4 hover:border-accent hover:shadow-sm transition"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-display font-bold text-lg leading-tight">
                      <span>{item.itemname}</span>
                    </div>
                    <div className="text-base text-muted shrink-0">
                      <span translate="no">${Number(item.price).toFixed(2)}</span>
                    </div>
                  </div>
                  {item.description && (
                    <div className="text-sm text-muted mt-2 leading-snug">
                      <span>{item.description}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )} {/* end !orderPlaced */}

      {/* Floating cart button */}
      <button
        onClick={() => setCartOpen(true)}
        aria-label={`Open cart with ${cart.length} item${cart.length !== 1 ? "s" : ""}`}
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
        <span>Cart</span>
        {cart.length > 0 && (
          <span translate="no" className="bg-white text-accent text-xs rounded-full px-2 py-0.5 font-medium">
            {cart.length}
          </span>
        )}
      </button>

      {/* Cart drawer overlay */}
      {cartOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setCartOpen(false)} />}

      {/* Cart drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 flex flex-col p-6 transition-transform duration-200 ${cartOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg"><span>Your Order</span></h2>
          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                aria-label="Remove all items from cart"
                className="text-sm text-muted text-red-500 transition hover:underline"
              >
                <span>Clear all</span>
              </button>
            )}
            <button
              onClick={() => setCartOpen(false)}
              className="text-muted hover:text-foreground transition text-xl"
              aria-label="Close cart"
            >
              <span>✕</span>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-muted text-sm"><span>No items added yet.</span></p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="border border-border rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium"><span>{item.item}</span></div>
                  <div className="text-muted shrink-0"><span translate="no">${item.price.toFixed(2)}</span></div>
                </div>
                {item.addOns.length > 0 && (
                  <div className="text-xs text-muted mt-1">
                    <span>{item.addOns.join(", ")}</span>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  {isCustomizable(item.item) && (
                    <button
                      onClick={() => startEditing(item)}
                      aria-label={`Customize ${item.item}`}
                      className="text-xs text-accent hover:underline"
                    >
                      <span>Customize</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setCart((prev) => prev.filter((c) => c.id !== item.id));
                      showToast(`${item.item} removed from cart`);
                    }}
                    className="text-xs text-muted hover:underline text-red-500 ml-auto"
                    aria-label={`Remove ${item.item} from cart`}
                  >
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex justify-between font-bold mb-3">
            <span>Total</span>
            <span translate="no">${total.toFixed(2)}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={cart.length === 0}
            className="w-full rounded-lg bg-accent py-2.5 text-white disabled:opacity-40"
          >
            <span>Place Order</span>
          </button>
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
          <span>{toast.message}</span>
        </div>
      )}

      {/* Customization modal */}
      {customizing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={closeCustomizing}
        >
          <div
            ref={customizingRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customize-title"
            className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="customize-title" className="text-xl font-bold mb-1" tabIndex={-1}><span>{customizing.itemname}</span></h3>
            {customizing.description && (
              <p className="text-sm text-muted mb-2"><span>{customizing.description}</span></p>
            )}
            <p className="text-base text-muted mb-5">
              <span translate="no">${Number(customizing.price).toFixed(2)}</span>
            </p>

            {/* Temperature */}
            {customizing.category === "Classic Drink" && (
              <>
                <p className="text-sm font-medium mb-2"><span>Temperature</span></p>
                <div className="flex gap-2 mb-5">
                  <button
                    key="Hot"
                    onClick={() => toggleAddOn("Hot")}
                    aria-label="Hot temperature"
                    aria-pressed={selectedAddOns.includes("Hot")}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${selectedAddOns.includes("Hot")
                        ? "border-accent bg-accent-light text-accent"
                        : "border-border text-muted hover:border-accent"
                      }`}
                  >
                    <span>Hot</span>
                  </button>
                </div>
              </>
            )}

            {/* Sugar levels */}
            <p className="text-sm font-medium mb-2"><span>Sugar Level</span></p>
            <div className="grid grid-cols-3 gap-2 mb-5" role="group" aria-label="Sugar level options">
              {SUGAR_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleExclusive(s, SUGAR_OPTIONS)}
                  aria-label={`${s} sugar`}
                  aria-pressed={selectedAddOns.includes(s)}
                  className={`rounded-lg border py-2 text-sm transition ${selectedAddOns.includes(s)
                      ? "border-accent bg-accent-light"
                      : "border-border hover:border-accent"
                    }`}
                >
                  <span>{s}</span>
                </button>
              ))}
            </div>

            <p className="text-sm font-medium mb-2"><span>Toppings</span></p>
            <div className="space-y-2 mb-6" role="group" aria-label="Topping options">
              {addOns.map((ao) => (
                <button
                  key={ao.itemid}
                  onClick={() => toggleAddOn(ao.itemname)}
                  aria-label={`${ao.itemname}, add $${Number(ao.price).toFixed(2)}`}
                  aria-pressed={selectedAddOns.includes(ao.itemname)}
                  className={`w-full flex justify-between items-center rounded-lg border p-3 text-sm transition ${selectedAddOns.includes(ao.itemname)
                      ? "border-accent bg-accent-light"
                      : "border-border hover:border-accent"
                    }`}
                >
                  <span>{ao.itemname}</span>
                  <span className="text-muted"><span translate="no">+${Number(ao.price).toFixed(2)}</span></span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeCustomizing}
                aria-label="Cancel customization"
                className="flex-1 rounded-lg border border-border py-2 font-medium hover:bg-background transition"
              >
                <span>Cancel</span>
              </button>
              <button
                onClick={confirmCustomization}
                aria-label={editingId !== null ? "Save changes to item" : "Add customized item to order"}
                className="flex-1 rounded-lg bg-accent py-2 text-white font-medium hover:opacity-90 transition"
              >
                <span>{editingId !== null ? "Save Changes" : "Add to Order"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* chatbot window */}
      <div className="fixed bottom-4 left-45">
        <ChatbotWindow />
      </div>
    </main>
  );
}

type ToastState = { visible: boolean; message: string };

function ChatbotWindow() {
  const [conversation, setConversation] = useState<ChatMessage[]>([
    { id: "init", message: "Hello! I'm Tara. What can I help you with today?" },
  ]);
  const [message, setMessage] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });
  const [keyboardOpen, setKeyboardOpen] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation, isOpen]);

  // Close the virtual keyboard whenever the chat panel collapses.
  useEffect(() => {
    if (!isOpen) setKeyboardOpen(false);
  }, [isOpen]);

  function showToast(msg: string) {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: "" }), 3500);
  }

  async function sendChatbotMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const lastId = conversation[conversation.length - 1]?.id ?? "";
    const req: ChatMessage = { id: lastId, message: trimmed };

    setMessage("");
    // Reset textarea height after clearing.
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);
    setConversation((prev) => [...prev, req]);

    try {
      const result = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!result.ok) {
        setMessage(trimmed);
        setConversation((prev) => prev.slice(0, -1));
        showToast("Something went wrong. Please try again.");
        return;
      }

      const body: ChatMessage = await result.json();
      setConversation((prev) => [...prev, body]);
    } catch {
      setMessage(trimmed);
      setConversation((prev) => prev.slice(0, -1));
      showToast("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatbotMessage(message);
    }
  }

  // Keep React state in sync with changes the VirtualKeyboard makes directly
  // to the textarea's DOM value, and resize the textarea to fit new content.
  function handleTextareaInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    setMessage(el.value);
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  const kbTheme: KeyboardTheme = "light";
  const kbLayout: KeyboardLayout = "qwerty";

  return (
    <div
      className="h-auto flex flex-col gap-0 rounded-4xl overflow-hidden shadow-lg"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Toast */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300"
        style={{
          background: "#ef4444",
          color: "#fff",
          opacity: toast.visible ? 1 : 0,
          pointerEvents: toast.visible ? "auto" : "none",
          transform: toast.visible
            ? "translateX(-50%) translateY(0)"
            : "translateX(-50%) translateY(-8px)",
        }}
        role="alert"
        aria-live="assertive"
      >
        <span>{toast.message}</span>
      </div>

      {/* Header */}
      <div
        className="pl-4 pt-3 pb-3 pr-3 font-semibold text-sm flex justify-between items-center"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        <span className="pr-8" translate="no">Tara</span>
        <button
          onClick={() => setIsOpen((o) => !o)}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150"
          style={{ background: "rgba(255,255,255,0.15)" }}
          aria-label={isOpen ? "Collapse chat" : "Expand chat"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{
              transition: "transform 0.25s ease",
              transform: isOpen ? "rotate(0deg)" : "rotate(180deg)",
            }}
          >
            <path
              d="M2 5l5 5 5-5"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Collapsible body */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          gridTemplateColumns: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          {/* Messages */}
          <div
            className="w-102 h-96 overflow-y-auto flex flex-col gap-2 py-4 px-3"
            style={{ background: "var(--accent-light)" }}
          >
            {conversation.map((cm, index) => {
              const isUser = index % 2 !== 0;
              return (
                <div
                  key={cm.id + cm.message}
                  className="max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    background: isUser ? "var(--accent)" : "var(--card)",
                    color: isUser ? "#fff" : "var(--foreground)",
                    border: isUser ? "none" : "1px solid var(--border)",
                    borderBottomRightRadius: isUser ? "4px" : undefined,
                    borderBottomLeftRadius: !isUser ? "4px" : undefined,
                  }}
                >
                  <span>{cm.message}</span>
                </div>
              );
            })}

            {isLoading && (
              <div
                className="max-w-[75%] px-4 py-3 rounded-2xl text-sm self-start"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderBottomLeftRadius: "4px",
                }}
              >
                <span
                  className="flex gap-1 items-center"
                  style={{ color: "var(--muted)" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]"
                    style={{ background: "var(--accent)" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]"
                    style={{ background: "var(--accent)" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]"
                    style={{ background: "var(--accent)" }}
                  />
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div
            className="mx-3 my-2 px-3 py-2 rounded-4xl flex flex-row items-end gap-2"
            style={{ border: "1px solid var(--border)", background: "var(--card)" }}
          >
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none appearance-none bg-transparent border-none focus:ring-0 focus:outline-none text-sm leading-relaxed"
              style={{
                color: "var(--foreground)",
                maxHeight: "7rem",
                minHeight: "1.5rem",
              }}
              placeholder="Ask anything…"
              rows={1}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              // VirtualKeyboard dispatches native "input" events, so we also
              // listen via onInput to stay in sync without duplicating onChange.
              onInput={handleTextareaInput}
              onKeyDown={handleKeyDown}
              onFocus={() => setKeyboardOpen(true)}
            />

            {/* Virtual keyboard toggle */}
            <button
              onClick={() => {
                setKeyboardOpen((o) => !o);
                // Return focus to the textarea so the keyboard has a target.
                textareaRef.current?.focus();
              }}
              className="mb-0.5 w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all duration-150"
              style={{
                background: keyboardOpen ? "var(--accent)" : "var(--border)",
                cursor: "pointer",
              }}
              aria-label={keyboardOpen ? "Hide virtual keyboard" : "Show virtual keyboard"}
              aria-pressed={keyboardOpen}
            >
              {/* Keyboard icon */}
              <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                <rect x="0.5" y="0.5" width="14" height="10" rx="1.5" stroke="#fff" strokeWidth="1.2" />
                <rect x="2" y="2.5" width="2" height="1.5" rx="0.4" fill="#fff" />
                <rect x="5" y="2.5" width="2" height="1.5" rx="0.4" fill="#fff" />
                <rect x="8" y="2.5" width="2" height="1.5" rx="0.4" fill="#fff" />
                <rect x="11" y="2.5" width="2" height="1.5" rx="0.4" fill="#fff" />
                <rect x="2" y="5" width="2" height="1.5" rx="0.4" fill="#fff" />
                <rect x="5" y="5" width="2" height="1.5" rx="0.4" fill="#fff" />
                <rect x="8" y="5" width="2" height="1.5" rx="0.4" fill="#fff" />
                <rect x="11" y="5" width="2" height="1.5" rx="0.4" fill="#fff" />
                <rect x="3.5" y="7.5" width="8" height="1.5" rx="0.4" fill="#fff" />
              </svg>
            </button>

            {/* Send button */}
            <button
              onClick={() => sendChatbotMessage(message)}
              disabled={!message.trim() || isLoading}
              className="mb-0.5 w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all duration-150"
              style={{
                background:
                  message.trim() && !isLoading ? "var(--accent)" : "var(--border)",
                cursor: message.trim() && !isLoading ? "pointer" : "not-allowed",
              }}
              aria-label="Send message"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 12V2M2 7l5-5 5 5"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Virtual keyboard — rendered in a portal via fixed positioning */}
      {keyboardOpen && (<VirtualKeyboard
        targetRef={textareaRef}
        isOpen={keyboardOpen}
        onClose={() => setKeyboardOpen(false)}
        layout={kbLayout}
        theme={kbTheme}
        placement="right"
        size="normal"
        draggable
        showClose
        onKeyPress={(key) => {
          // Send on Enter (VirtualKeyboard handles insertion; we just need
          // to trigger send for the non-textarea Enter behaviour).
          if (key === "Enter") {
            // Give the DOM event a tick to flush before reading message state.
            setTimeout(() => {
              const current = textareaRef.current?.value ?? "";
              if (current.trim()) sendChatbotMessage(current);
            }, 0);
          }
        }}
      />)}
    </div>
  );
}