"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; text: string };

type ToastApi = {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Successes fade after a few seconds; errors stay until closed. */
const SUCCESS_MS = 5000;
const MAX_TOASTS = 4;

/**
 * Short messages near the bottom of the screen, so they're seen wherever the
 * page is scrolled. Errors inside a form still show next to the form.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (tone: Tone, text: string) => {
      const id = nextId.current++;
      setToasts((all) =>
        [...all.filter((t) => t.text !== text), { id, tone, text }].slice(-MAX_TOASTS),
      );
      if (tone !== "error") setTimeout(() => dismiss(id), SUCCESS_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => show("success", text),
      error: (text) => show("error", text),
      info: (text) => show("info", text),
    }),
    [show],
  );

  const polite = toasts.filter((t) => t.tone !== "error");
  const urgent = toasts.filter((t) => t.tone === "error");
  const item = (t: Toast) => (
    <li key={t.id} className={`toast toast--${t.tone}`}>
      <span className="min-w-0 flex-1">{t.text}</span>
      <button
        type="button"
        className="toast-close"
        aria-label="Close message"
        onClick={() => dismiss(t.id)}
      >
        ×
      </button>
    </li>
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region">
        {/* Two live regions: errors interrupt, the rest wait their turn. */}
        <ul role="alert" className="contents">
          {urgent.map(item)}
        </ul>
        <ul role="status" className="contents">
          {polite.map(item)}
        </ul>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast needs a ToastProvider");
  return api;
}
