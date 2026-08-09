export default function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <div
                    className="h-4 animate-pulse rounded bg-gray-200"
                    style={{ width: `${55 + ((r + c) % 3) * 15}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
