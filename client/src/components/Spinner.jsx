export default function Spinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}
