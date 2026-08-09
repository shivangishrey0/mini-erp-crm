import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type, leaving: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    }, 2700);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TYPE_STYLES = {
  success: "bg-gray-900",
  error: "bg-red-600",
};

function Toast({ message, type, leaving }) {
  // Mounts hidden, flips to visible next frame so the transition actually
  // animates on entry (a transition can't animate a value it was already at).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const visible = mounted && !leaving;

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-300 ${TYPE_STYLES[type]} ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
