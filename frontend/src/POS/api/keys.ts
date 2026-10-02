/**
 * Every register query key, nested so a prefix invalidates a whole family:
 * invalidating `orders` refreshes the order list and every order detail.
 */
export const posKeys = {
  me: ["pos", "me"] as const,
  categories: ["pos", "categories"] as const,
  products: ["pos", "products"] as const,
  discounts: ["pos", "discounts"] as const,
  customerSearch: (term: string) => ["pos", "customers", "search", term] as const,

  orders: ["pos", "orders"] as const,
  orderLists: ["pos", "orders", "list"] as const,
  /** `day` is the register's local YYYY-MM-DD, so the list rolls over at midnight. */
  orderList: (day: string) => ["pos", "orders", "list", day] as const,
  order: (orderId: number) => ["pos", "orders", "detail", orderId] as const,
};
