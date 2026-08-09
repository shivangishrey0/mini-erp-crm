// Shared stagger-reveal variants for lists/tables - used by the Dashboard
// and every list page so new rows/cards consistently fade+slide in instead
// of popping in all at once.
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};
