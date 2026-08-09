const VARIANTS = {
  gray: "bg-gray-100 text-gray-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
};

export default function Badge({ children, variant = "gray" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tracking-wide ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}

export const CUSTOMER_STATUS_VARIANT = { LEAD: "blue", ACTIVE: "green", INACTIVE: "gray" };
export const CHALLAN_STATUS_VARIANT = { DRAFT: "gray", CONFIRMED: "green", CANCELLED: "red" };
