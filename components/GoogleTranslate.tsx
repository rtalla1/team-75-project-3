import { useEffect } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: {
          new (
            options: {
              pageLanguage: string;
              layout?: number;
              autoDisplay?: boolean;
            },
            elementId: string
          ): unknown;
          InlineLayout: { HORIZONTAL: number };
        };
      };
    };
  }
}

const GoogleTranslate: React.FC = () => {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (!window.google) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          layout: window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

    const existingScript = document.getElementById("google-translate-script");
    if (!existingScript) {
      const addScript = document.createElement("script");
      addScript.setAttribute("id", "google-translate-script");
      addScript.setAttribute(
        "src",
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      );
      document.body.appendChild(addScript);
    }

    // When React mounts new content (e.g. menu items after a category change),
    // ask Google Translate to retranslate. While Google's own translate cycle
    // is running we don't dispatch again — but we DO remember that a real
    // mutation happened, so we can replay once Google is done.
    let debounce: number | null = null;
    let translating = false;
    let pending = false;

    const triggerRetranslate = () => {
      const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
      if (!select || !select.value || select.value === "en") return;
      translating = true;
      pending = false;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      window.setTimeout(() => {
        translating = false;
        if (pending) {
          pending = false;
          triggerRetranslate();
        }
      }, 1500);
    };

    const observer = new MutationObserver((mutations) => {
      const hasNewContent = mutations.some((m) => {
        if (m.type !== "childList" || m.addedNodes.length === 0) return false;
        return Array.from(m.addedNodes).some((n) => {
          if (n.nodeType !== 1) return false;
          const el = n as Element;
          if (el.closest(".goog-te-banner-frame, .skiptranslate, .goog-te-balloon-frame")) return false;
          if (el.tagName === "FONT") return false;
          // A subtree that already contains <font> descendants is Google's
          // translation output, not new React content. React doesn't render <font>.
          if (el.querySelector("font")) return false;
          const cls = typeof el.className === "string" ? el.className : "";
          if (cls.includes("goog-")) return false;
          // Purely structural mutations (no translatable text) shouldn't trigger a retranslate
          if (!el.textContent || !el.textContent.trim()) return false;
          return true;
        });
      });

      if (!hasNewContent) return;

      if (translating) {
        pending = true;
        return;
      }

      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        debounce = null;
        triggerRetranslate();
      }, 300);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (debounce) window.clearTimeout(debounce);
    };
  }, []);

  return (
    <div style={{ padding: "10px" }}>
      <div id="google_translate_element"></div>
    </div>
  );
};

export default GoogleTranslate;
