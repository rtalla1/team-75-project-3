import {
  useState,
  useEffect,
  useRef,
  useCallback,
  CSSProperties,
  RefObject,
  MouseEvent,
  TouchEvent,
  FocusEventHandler,
} from "react";

// ─── Union Types ───────────────────────────────────────────────────────────────

export type KeyboardLayout = "qwerty" | "numeric";
export type KeyboardPlacement = "bottom" | "right";
export type KeyboardTheme = "light" | "dark" | "glass";
export type KeyboardSize = "normal" | "compact";

/** Every key string that receives special handling or a symbol label. */
export type SpecialKey = "Backspace" | "Enter" | "Shift" | "CapsLock" | "Tab" | "Space";

/** Any key emitted by the keyboard — either a special key or a printable character. */
export type KeyValue = SpecialKey | string;

// ─── Internal Types ────────────────────────────────────────────────────────────

/** A row is an ordered list of key strings. */
type KeyRow = KeyValue[];

/** Each layout variant (default / shifted) is a list of rows. */
interface LayoutVariant {
  default: KeyRow[];
  shifted: KeyRow[];
}

/** Top-level layout map keyed by layout name. */
type LayoutMap = Record<KeyboardLayout, LayoutVariant>;

/** CSS custom-property token map for a single theme. */
type ThemeTokens = Record<string, string>;

/** Internal drag tracking state stored in a ref. */
interface DragState {
  dragging: boolean;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

/** 2-D position used for both drag state and keyboard placement. */
interface Position {
  x: number;
  y: number;
}

// ─── Key Layout Definitions ────────────────────────────────────────────────────

const LAYOUTS: LayoutMap = {
  qwerty: {
    default: [
      ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
      ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
      ["CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
      ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
      ["Space"],
    ],
    shifted: [
      ["~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", "Backspace"],
      ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "{", "}", "|"],
      ["CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ":", '"', "Enter"],
      ["Shift", "Z", "X", "C", "V", "B", "N", "M", "<", ">", "?", "Shift"],
      ["Space"],
    ],
  },
  numeric: {
    default: [
      ["7", "8", "9"],
      ["4", "5", "6"],
      ["1", "2", "3"],
      [".", "0", "Backspace"],
    ],
    shifted: [
      ["7", "8", "9"],
      ["4", "5", "6"],
      ["1", "2", "3"],
      [".", "0", "Backspace"],
    ],
  },
};

const SPECIAL_KEY_LABELS: Record<SpecialKey, string> = {
  Backspace: "⌫",
  Enter: "↵",
  Shift: "⇧",
  CapsLock: "⇪",
  Tab: "⇥",
  Space: "Space",
};

const SPECIAL_KEY_WIDTHS: Partial<Record<KeyValue, number>> = {
  Backspace: 2,
  Enter: 1.8,
  Shift: 2.2,
  CapsLock: 1.8,
  Tab: 1.5,
  "\\": 1.5,
  Space: 8,
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function getKeyLabel(key: KeyValue): string {
  return (SPECIAL_KEY_LABELS as Record<string, string>)[key] ?? key;
}

function getKeyWidth(key: KeyValue): number {
  return SPECIAL_KEY_WIDTHS[key] ?? 1;
}

/** Valid target elements: anything with a selectable text value. */
type TextInputElement = HTMLInputElement | HTMLTextAreaElement;

function insertAtCursor(el: TextInputElement | null, char: string): void {
  if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + char + el.value.slice(end);
  const pos = start + char.length;
  el.setSelectionRange(pos, pos);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function deleteAtCursor(el: TextInputElement | null): void {
  if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  if (start !== end) {
    el.value = el.value.slice(0, start) + el.value.slice(end);
    el.setSelectionRange(start, start);
  } else if (start > 0) {
    el.value = el.value.slice(0, start - 1) + el.value.slice(start);
    el.setSelectionRange(start - 1, start - 1);
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// ─── Hook: Keyboard Position ──────────────────────────────────────────────────

function useKeyboardPosition(
  targetRef: RefObject<TextInputElement | null>,
  isOpen: boolean,
  placement: KeyboardPlacement
): [Position, React.Dispatch<React.SetStateAction<Position>>] {
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 });
  const [hasInitialPos, setHasInitialPos] = useState(false);

  useEffect(() => {
    if (!isOpen || !targetRef?.current || hasInitialPos) return;

    const el = targetRef.current;
    const rect = el.getBoundingClientRect();
    const kbWidth = placement === "right" ? 380 : 680;
    const kbHeight = placement === "right" ? 260 : 220;
    const gap = 8;

    let x: number;
    let y: number;

    if (placement === "right") {
      x = Math.min(rect.right + gap, window.innerWidth - kbWidth - 8);
      y = Math.min(rect.top, window.innerHeight - kbHeight - 8);
    } else {
      x = Math.max(0, Math.min(rect.left, window.innerWidth - kbWidth - 8));
      y = rect.bottom + gap;
      if (y + kbHeight > window.innerHeight) {
        y = rect.top - kbHeight - gap;
      }
    }

    setPos({ x: Math.max(0, x), y: Math.max(0, y) });
    setHasInitialPos(true);
  }, [isOpen, targetRef, placement, hasInitialPos]);

  useEffect(() => {
    if (!isOpen) setHasInitialPos(false);
  }, [isOpen]);

  return [pos, setPos];
}

// ─── Key Component ────────────────────────────────────────────────────────────

interface KeyProps {
  label: KeyValue;
  onPress: (key: KeyValue) => void;
  isActive: boolean;
  width?: number;
  /** Re-uses the KeyboardSize type: "normal" | "compact". */
  size: KeyboardSize;
}

function Key({ label, onPress, isActive, width = 1, size }: KeyProps) {
  const [pressed, setPressed] = useState(false);

  const handlePress = (): void => {
    setPressed(true);
    onPress(label);
    setTimeout(() => setPressed(false), 100);
  };

  const isSpecial = label in SPECIAL_KEY_LABELS || label === "Space";
  const unitWidth = size === "compact" ? 34 : 38;
  const gap = 4;
  const keyWidth = width * unitWidth + (width - 1) * gap;

  const handleMouseDown = (e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    handlePress();
  };

  const handleTouchStart = (e: TouchEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    handlePress();
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        width: `${keyWidth}px`,
        height: size === "compact" ? "34px" : "38px",
        flexShrink: 0,
        borderRadius: "6px",
        border: isActive
          ? "1.5px solid var(--kb-accent)"
          : "1.5px solid var(--kb-border)",
        background: isSpecial
          ? pressed
            ? "var(--kb-special-pressed)"
            : "var(--kb-special)"
          : pressed
          ? "var(--kb-key-pressed)"
          : "var(--kb-key)",
        color: isActive ? "var(--kb-accent)" : "var(--kb-text)",
        fontSize: label === "Space" ? "11px" : "13px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: isSpecial ? 600 : 400,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 80ms, transform 60ms, border-color 80ms",
        transform: pressed ? "translateY(1px) scale(0.97)" : "none",
        userSelect: "none",
        letterSpacing: "0.02em",
        boxShadow: pressed
          ? "none"
          : "0 1px 0 var(--kb-shadow), 0 2px 4px rgba(0,0,0,0.08)",
        outline: "none",
      }}
    >
      {getKeyLabel(label)}
    </button>
  );
}

// ─── VirtualKeyboard Props ────────────────────────────────────────────────────

export interface VirtualKeyboardProps {
  /**
   * A React ref pointing to the `<input>` or `<textarea>` that the keyboard
   * should type into. Obtain via `useRef<HTMLInputElement>(null)` etc.
   */
  targetRef: RefObject<TextInputElement | null>;

  /** Controlled visibility flag. */
  isOpen: boolean;

  /** Called when the user presses the close (×) button. */
  onClose?: () => void;

  /**
   * Key layout to render.
   * - `"qwerty"` — full alphanumeric layout (default)
   * - `"numeric"` — compact numpad (0–9, decimal, backspace)
   */
  layout?: KeyboardLayout;

  /**
   * Where the keyboard appears relative to the focused input on first open.
   * The keyboard can be dragged freely after that.
   * - `"bottom"` — below the input (default)
   * - `"right"` — to the right of the input
   */
  placement?: KeyboardPlacement;

  /**
   * Visual theme.
   * - `"light"` — warm off-white (default)
   * - `"dark"` — near-black surface
   * - `"glass"` — frosted-glass / backdrop-blur effect
   */
  theme?: KeyboardTheme;

  /**
   * Key size.
   * - `"normal"` — 38 px tall keys (default)
   * - `"compact"` — 34 px tall keys, narrower overall footprint
   */
  size?: KeyboardSize;

  /** Whether the close (×) button is rendered in the drag handle. Default `true`. */
  showClose?: boolean;

  /**
   * Fired on every key press, **before** the character is inserted.
   * Receives the raw key string (e.g. `"a"`, `"Shift"`, `"Backspace"`).
   */
  onKeyPress?: (key: KeyValue) => void;

  /** Additional CSS class applied to the keyboard container `<div>`. */
  className?: string;

  /** Additional inline styles merged onto the keyboard container `<div>`. */
  style?: CSSProperties;

  /** Whether the keyboard can be dragged around the screen. Default `true`. */
  draggable?: boolean;

  /** CSS `z-index` for the keyboard container. Default `9999`. */
  zIndex?: number;

  /** Whether Caps Lock starts engaged. Default `false`. */
  capsLockDefault?: boolean;
}

// ─── VirtualKeyboard Component ────────────────────────────────────────────────

export default function VirtualKeyboard({
  targetRef,
  isOpen,
  onClose,
  layout = "qwerty",
  placement = "bottom",
  theme = "light",
  size = "normal",
  showClose = true,
  onKeyPress,
  className = "",
  style = {},
  draggable = true,
  zIndex = 9999,
  capsLockDefault = false,
}: VirtualKeyboardProps) {
  const [shifted, setShifted] = useState(false);
  const [capsLock, setCapsLock] = useState(capsLockDefault);
  const [pos, setPos] = useKeyboardPosition(targetRef, isOpen, placement);

  const dragState = useRef<DragState>({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const kbRef = useRef<HTMLDivElement>(null);

  // ── Dragging ──

  const onDragStart = useCallback(
    (e: MouseEvent | TouchEvent): void => {
      if (!draggable) return;
      if ((e.target as HTMLElement).tagName === "BUTTON") return;

      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      dragState.current = {
        dragging: true,
        startX: clientX,
        startY: clientY,
        originX: pos.x,
        originY: pos.y,
      };
      e.preventDefault();
    },
    [draggable, pos]
  );

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent | globalThis.TouchEvent): void => {
      if (!dragState.current.dragging) return;
      const clientX =
        "touches" in e
          ? (e as globalThis.TouchEvent).touches[0].clientX
          : (e as globalThis.MouseEvent).clientX;
      const clientY =
        "touches" in e
          ? (e as globalThis.TouchEvent).touches[0].clientY
          : (e as globalThis.MouseEvent).clientY;

      const dx = clientX - dragState.current.startX;
      const dy = clientY - dragState.current.startY;
      const kb = kbRef.current;
      const maxX = window.innerWidth - (kb?.offsetWidth ?? 0);
      const maxY = window.innerHeight - (kb?.offsetHeight ?? 0);

      setPos({
        x: Math.max(0, Math.min(dragState.current.originX + dx, maxX)),
        y: Math.max(0, Math.min(dragState.current.originY + dy, maxY)),
      });
    };

    const onUp = (): void => {
      dragState.current.dragging = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [setPos]);

  // ── Key press handler ──

  const handleKey = useCallback(
    (key: KeyValue): void => {
      const el = targetRef?.current ?? null;
      onKeyPress?.(key);

      switch (key) {
        case "Shift":
          setShifted((s) => !s);
          return;
        case "CapsLock":
          setCapsLock((c) => !c);
          setShifted(false);
          return;
        case "Backspace":
          deleteAtCursor(el);
          return;
        case "Enter":
          if (el?.tagName === "TEXTAREA") {
            insertAtCursor(el, "\n");
          } else {
            (el as HTMLInputElement | null)?.form?.requestSubmit?.();
          }
          return;
        case "Tab":
          insertAtCursor(el, "\t");
          return;
        case "Space":
          insertAtCursor(el, " ");
          return;
        default: {
          const char = capsLock !== shifted ? key.toUpperCase() : key.toLowerCase();
          insertAtCursor(el, char);
          if (shifted) setShifted(false); // auto-release shift after one character
        }
      }
    },
    [targetRef, onKeyPress, capsLock, shifted]
  );

  // ── Theme tokens ──

  const THEME_TOKENS: Record<KeyboardTheme, ThemeTokens> = {
    light: {
      "--kb-bg": "#f0efe8",
      "--kb-surface": "#fafaf7",
      "--kb-key": "#ffffff",
      "--kb-key-pressed": "#e4e2d9",
      "--kb-special": "#dddbd3",
      "--kb-special-pressed": "#c8c6be",
      "--kb-border": "#d1cfc7",
      "--kb-shadow": "#c4c2ba",
      "--kb-text": "#2a2925",
      "--kb-accent": "#d4621a",
      "--kb-handle": "#c4c2ba",
      "--kb-handle-dots": "#a8a69e",
    },
    dark: {
      "--kb-bg": "#1a1917",
      "--kb-surface": "#242220",
      "--kb-key": "#2e2c2a",
      "--kb-key-pressed": "#1c1b19",
      "--kb-special": "#222120",
      "--kb-special-pressed": "#161514",
      "--kb-border": "#3d3b38",
      "--kb-shadow": "#111010",
      "--kb-text": "#e8e6e0",
      "--kb-accent": "#f07a30",
      "--kb-handle": "#3d3b38",
      "--kb-handle-dots": "#5a5855",
    },
    glass: {
      "--kb-bg": "rgba(255,255,255,0.18)",
      "--kb-surface": "rgba(255,255,255,0.22)",
      "--kb-key": "rgba(255,255,255,0.55)",
      "--kb-key-pressed": "rgba(255,255,255,0.35)",
      "--kb-special": "rgba(200,200,200,0.35)",
      "--kb-special-pressed": "rgba(180,180,180,0.35)",
      "--kb-border": "rgba(255,255,255,0.4)",
      "--kb-shadow": "rgba(0,0,0,0.08)",
      "--kb-text": "#1a1917",
      "--kb-accent": "#d4621a",
      "--kb-handle": "rgba(255,255,255,0.3)",
      "--kb-handle-dots": "rgba(0,0,0,0.2)",
    },
  };

  const tokens = THEME_TOKENS[theme];
  const rows = LAYOUTS[layout]?.[shifted !== capsLock ? "shifted" : "default"] ?? [];

  if (!isOpen) return null;

  const handleClose = (e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    onClose?.();
  };

  return (
    <>
      {/* IBM Plex Mono font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap');`}</style>

      <div
        ref={kbRef}
        className={className}
        translate="no"
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex,
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow:
            theme === "glass"
              ? "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5)"
              : "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
          backdropFilter: theme === "glass" ? "blur(20px) saturate(1.6)" : "none",
          WebkitBackdropFilter: theme === "glass" ? "blur(20px) saturate(1.6)" : "none",
          border:
            theme === "glass"
              ? "1px solid rgba(255,255,255,0.35)"
              : "1px solid var(--kb-border)",
          // Spread CSS custom property tokens. CSSProperties doesn't know about
          // custom properties, so we cast to bypass the strict index signature.
          ...(tokens as CSSProperties),
          ...style,
        }}
      >
        {/* ── Drag handle ── */}
        <div
          onMouseDown={onDragStart as unknown as React.MouseEventHandler}
          onTouchStart={onDragStart as unknown as React.TouchEventHandler}
          style={{
            background: "var(--kb-surface)",
            borderBottom: "1px solid var(--kb-border)",
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: draggable ? "grab" : "default",
            userSelect: "none",
          }}
        >
          {/* Grip dots */}
          <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "var(--kb-handle-dots)",
                }}
              />
            ))}
          </div>

          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--kb-handle-dots)",
            }}
          >
            {layout === "numeric" ? "Numeric" : "Keyboard"}
          </span>

          {showClose && (
            <button
              onMouseDown={handleClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--kb-handle-dots)",
                fontSize: "16px",
                lineHeight: 1,
                padding: "0 2px",
                display: "flex",
                alignItems: "center",
                fontFamily: "monospace",
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* ── Key grid ── */}
        <div
          style={{
            background: "var(--kb-bg)",
            padding: size === "compact" ? "8px" : "10px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {rows.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {row.map((key, ki) => (
                <Key
                  key={`${ri}-${ki}-${key}`}
                  label={key}
                  onPress={handleKey}
                  width={getKeyWidth(key)}
                  size={size}
                  isActive={
                    (key === "Shift" && shifted) ||
                    (key === "CapsLock" && capsLock)
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── useVirtualKeyboard Hook ──────────────────────────────────────────────────

/**
 * Options accepted by `useVirtualKeyboard`.
 * Omits the props that the hook manages internally (`targetRef`, `isOpen`, `onClose`).
 */
export type UseVirtualKeyboardOptions = Omit<
  VirtualKeyboardProps,
  "targetRef" | "isOpen" | "onClose"
> & {
  /**
   * When `true`, the underlying `<input>` / `<textarea>` is set to `readOnly`
   * so the native on-screen keyboard never appears on mobile.
   * Default `false`.
   */
  readOnly?: boolean;
};

/** Props spread onto the `<input>` or `<textarea>` element. */
export interface VirtualKeyboardInputProps {
  ref: RefObject<TextInputElement | null>;
  onFocus: FocusEventHandler<TextInputElement>;
  readOnly: boolean;
}

/** Return value of `useVirtualKeyboard`. */
export interface UseVirtualKeyboardReturn {
  /** Spread these directly onto your `<input>` or `<textarea>`. */
  inputProps: VirtualKeyboardInputProps;
  /** Spread these directly onto `<VirtualKeyboard />`. */
  keyboardProps: VirtualKeyboardProps;
  /** Whether the keyboard is currently visible. */
  isOpen: boolean;
  /** Programmatically open or close the keyboard. */
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** The ref attached to the target input — useful when you need direct DOM access. */
  inputRef: RefObject<TextInputElement | null>;
}

/**
 * Convenience hook that manages keyboard visibility and wires the ref between
 * an input element and `<VirtualKeyboard>`.
 *
 * @example
 * ```tsx
 * const { inputProps, keyboardProps } = useVirtualKeyboard({ theme: "dark" });
 *
 * return (
 *   <>
 *     <input {...inputProps} />
 *     <VirtualKeyboard {...keyboardProps} />
 *   </>
 * );
 * ```
 */
export function useVirtualKeyboard(
  options: UseVirtualKeyboardOptions = {}
): UseVirtualKeyboardReturn {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<TextInputElement>(null);

  const { readOnly = false, ...keyboardOptions } = options;

  const inputProps: VirtualKeyboardInputProps = {
    ref: inputRef,
    onFocus: () => setIsOpen(true),
    readOnly,
  };

  const keyboardProps: VirtualKeyboardProps = {
    targetRef: inputRef,
    isOpen,
    onClose: () => setIsOpen(false),
    ...keyboardOptions,
  };

  return { inputProps, keyboardProps, isOpen, setIsOpen, inputRef };
}