import { AnimatePresence, motion } from "framer-motion";

// Reserved for irreversible actions per the "confirmations only where they
// matter" principle - e.g. cancelling a challan is a terminal state
// transition with no undo, but confirming a draft isn't (you can still
// cancel it afterward), so only cancel uses this.
export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            aria-hidden="true"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-gray-900/40"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.15 } }}
            transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
            className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
