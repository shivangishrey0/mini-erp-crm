const VARIANTS = {
  gray: "bg-gray-100 text-gray-700 ring-gray-500/15",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/15",
  green: "bg-green-50 text-green-700 ring-green-600/15",
  red: "bg-red-50 text-red-700 ring-red-600/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/15",
};

export default function Badge({ children, variant = "gray" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tracking-wide ring-1 ring-inset ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}

export const CUSTOMER_STATUS_VARIANT = { LEAD: "blue", ACTIVE: "green", INACTIVE: "gray" };
export const CHALLAN_STATUS_VARIANT = { DRAFT: "gray", CONFIRMED: "green", CANCELLED: "red" };
