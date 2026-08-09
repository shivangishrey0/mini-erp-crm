import { useEffect, useState } from "react";

// Reserved for irreversible actions per the "confirmations only where they
// matter" principle - e.g. cancelling a challan is a terminal state
// transition with no undo, but confirming a draft isn't (you can still
// cancel it afterward), so only cancel uses this.
export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        aria-hidden="true"
        onClick={onCancel}
        className={`absolute inset-0 bg-gray-900/40 transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={`relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl transition-all duration-200 ${
          mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold tracking-tight text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-transform duration-100 hover:bg-gray-100 active:scale-95"
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 active:scale-95 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
