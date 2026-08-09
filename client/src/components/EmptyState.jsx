export default function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
      {Icon && <Icon className="h-7 w-7" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}
