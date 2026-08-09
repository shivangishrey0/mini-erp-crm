export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}
