/**
 * Placeholder data for the cashier POS: the menu, a few registered customers,
 * and the current shift's orders, timed relative to now so the orders panel
 * always looks live. The menu matches the manager console's mock rows.
 * Swap createSeed() for API calls once the backend routes are wired; every
 * row already matches its table in init.sql (extra fields are marked in types.ts).
 */
import type {
  Category,
  Customer,
  Discount,
  ItemSize,
  Order,
  OrderItem,
  OrderType,
  Payment,
  PaymentMethod,
  PosDb,
  Product,
} from "../types";
import { round2 } from "../utils/format";
import { discountFor, subtotalOf, unitPrice } from "../utils/pricing";

/** The signed-in cashier until auth is wired; stamps every order rung up at this register. */
export const CURRENT_CASHIER_ID = 2;

/* ============================= MENU ============================= */

export const CATEGORIES: Category[] = [
  { category_id: 1, category_name: "Espresso", image_url: null },
  { category_id: 2, category_name: "Frappés", image_url: null },
  { category_id: 3, category_name: "Non-Coffee", image_url: null },
  { category_id: 4, category_name: "Pastries", image_url: null },
  { category_id: 5, category_name: "Snacks", image_url: null },
];

type ProductRow = [number, string, number, string, boolean?];

const PRODUCT_ROWS: ProductRow[] = [
  [1, "Americano", 120, "Double espresso topped with hot water."],
  [1, "Café latte", 145, "Espresso with steamed milk and a thin layer of foam."],
  [1, "Cappuccino", 145, "Equal parts espresso, steamed milk and airy foam."],
  [1, "Caramel macchiato", 165, "Vanilla milk marked with espresso and a caramel drizzle."],
  [1, "Spanish latte", 160, "Espresso and milk sweetened with condensed milk."],
  [1, "Café mocha", 160, "Espresso, chocolate sauce and steamed milk."],
  [2, "Strawberry frappé", 165, "Strawberry purée blended with milk and ice, crowned with whipped cream."],
  [2, "Mocha frappé", 175, "Espresso and rich chocolate, finished with white chocolate curls."],
  [2, "Matcha frappé", 180, "Japanese matcha whisked with milk and blended over crushed ice."],
  [2, "Java chip frappé", 185, "Coffee, mocha sauce and chocolate chips blended thick and frosty."],
  [2, "Mango frappé", 170, "Sweet mangoes blended smooth into a bright, caffeine-free treat."],
  [3, "Matcha latte", 165, "Ceremonial-grade matcha with oat milk."],
  [3, "Dark chocolate", 130, "Rich chocolate sauce with steamed milk."],
  [3, "Strawberry milk", 140, "Strawberry purée swirled into cold milk.", false],
  [4, "Butter croissant", 95, "Flaky, all-butter croissant, warmed to order."],
  [4, "Blueberry muffin", 85, "Soft muffin packed with blueberries."],
  [4, "Cheese ensaymada", 75, "Buttery brioche topped with sugar and grated cheese."],
  [4, "Banana bread", 80, "Moist banana bread slice with walnuts."],
  [5, "Ham & cheese sandwich", 145, "Toasted ham and cheese on milk bread."],
  [5, "Chocolate chip cookie", 60, "Chewy cookie with dark chocolate chunks."],
];

const DRINK_CATEGORIES = new Set([1, 2, 3]);

export const PRODUCTS: Product[] = PRODUCT_ROWS.map(([category_id, product_name, price, description, available], i) => ({
  product_id: i + 1,
  category_id,
  product_name,
  description,
  image_url: null,
  price,
  is_available: available ?? true,
  has_sizes: DRINK_CATEGORIES.has(category_id),
}));

/* ======================= CUSTOMERS & DISCOUNTS ======================= */

const CUSTOMER_ROWS: [string, string, string | null][] = [
  ["Mika", "Reyes", "2023-10421"],
  ["Joshua", "Garcia", "2022-08813"],
  ["Trisha", "Bautista", "2024-01177"],
  ["Enzo", "Flores", null],
  ["Camille", "Torres", "2021-05532"],
  ["Rafael", "Cruz", null],
  ["Isabel", "Navarro", "2023-11890"],
  ["Lara", "Domingo", null],
];

const CUSTOMERS: Customer[] = CUSTOMER_ROWS.map(([first_name, last_name, university_id], i) => ({
  customer_id: i + 1,
  first_name,
  last_name,
  university_id,
  customer_email: `${first_name}.${last_name}@${university_id ? "student.edu.ph" : "gmail.com"}`.toLowerCase(),
}));

const DISCOUNTS: Discount[] = [
  { discount_id: 1, discount_name: "Student", kind: "percent", value: 10, eligibility: "university_id", is_active: true },
  { discount_id: 2, discount_name: "Senior citizen", kind: "percent", value: 20, eligibility: "government_id", is_active: true },
  { discount_id: 3, discount_name: "PWD", kind: "percent", value: 20, eligibility: "government_id", is_active: true },
  { discount_id: 4, discount_name: "Loyalty reward", kind: "fixed", value: 50, eligibility: "none", is_active: true },
];

/* ============================ SHIFT ORDERS ============================ */

type SeedItem = [productName: string, size: ItemSize | null, quantity: number, note?: string];

interface SeedOrder {
  minutesAgo: number;
  type: OrderType;
  customerId: number | null;
  status: Order["order_status"];
  method: PaymentMethod;
  discountId?: number;
  items: SeedItem[];
}

const SEED_ORDERS: SeedOrder[] = [
  { minutesAgo: 212, type: "walk_in", customerId: null, status: "completed", method: "cash", items: [["Americano", "tall", 1], ["Butter croissant", null, 1]] },
  { minutesAgo: 188, type: "online", customerId: 1, status: "completed", method: "e_wallet", discountId: 1, items: [["Mocha frappé", "venti", 2]] },
  { minutesAgo: 163, type: "walk_in", customerId: null, status: "completed", method: "card", items: [["Spanish latte", "grade", 1]] },
  { minutesAgo: 141, type: "walk_in", customerId: null, status: "completed", method: "cash", discountId: 2, items: [["Caramel macchiato", "tall", 1], ["Blueberry muffin", null, 1]] },
  { minutesAgo: 122, type: "online", customerId: 4, status: "cancelled", method: "e_wallet", items: [["Matcha frappé", "tall", 1]] },
  { minutesAgo: 96, type: "walk_in", customerId: 2, status: "completed", method: "cash", discountId: 1, items: [["Java chip frappé", "grade", 1], ["Chocolate chip cookie", null, 2]] },
  { minutesAgo: 71, type: "online", customerId: 6, status: "completed", method: "card", items: [["Strawberry frappé", "tall", 1], ["Mango frappé", "tall", 1]] },
  { minutesAgo: 47, type: "walk_in", customerId: null, status: "completed", method: "cash", discountId: 4, items: [["Café latte", "venti", 2], ["Banana bread", null, 1]] },
  { minutesAgo: 17, type: "walk_in", customerId: null, status: "pending", method: "cash", items: [["Cappuccino", "tall", 2], ["Cheese ensaymada", null, 1]] },
  { minutesAgo: 9, type: "online", customerId: 3, status: "pending", method: "e_wallet", discountId: 1, items: [["Mocha frappé", "grade", 1, "Less ice, extra whip"], ["Banana bread", null, 1]] },
  { minutesAgo: 4, type: "online", customerId: 8, status: "pending", method: "card", items: [["Java chip frappé", "venti", 1], ["Matcha latte", "tall", 1, "Oat milk"]] },
  { minutesAgo: 2, type: "walk_in", customerId: null, status: "pending", method: "cash", items: [["Dark chocolate", "tall", 1]] },
];

/** Builds orders, items and payments from SEED_ORDERS. Order ids continue the shop's running count. */
function seedShift(now: Date): Pick<PosDb, "orders" | "order_items" | "payments"> {
  const byName = new Map(PRODUCTS.map((p) => [p.product_name, p]));
  const orders: Order[] = [];
  const order_items: OrderItem[] = [];
  const payments: Payment[] = [];
  let itemId = 0;

  SEED_ORDERS.forEach((seed, i) => {
    const order_id = 1041 + i;
    const ordered_at = new Date(now.getTime() - seed.minutesAgo * 60_000).toISOString();
    const items: OrderItem[] = seed.items.map(([name, size, quantity, note]) => {
      const product = byName.get(name)!;
      return {
        order_item_id: ++itemId,
        order_id,
        product_id: product.product_id,
        quantity,
        size,
        selling_price: unitPrice(product, size),
        special_instructions: note ?? null,
      };
    });
    order_items.push(...items);

    const subtotal = subtotalOf(items);
    const discount = DISCOUNTS.find((d) => d.discount_id === seed.discountId);
    const discount_amount = discount ? discountFor(discount, subtotal) : 0;
    const total_amount = round2(subtotal - discount_amount);

    orders.push({
      order_id,
      customer_id: seed.customerId,
      // employees.employee_id is NOT NULL on orders, so online orders are stamped
      // with the cashier on duty until the schema says otherwise.
      employee_id: CURRENT_CASHIER_ID,
      ordered_at,
      discount_amount,
      total_amount,
      order_status: seed.status,
      order_type: seed.type,
      discount_id: discount?.discount_id ?? null,
    });

    if (total_amount > 0) {
      payments.push({
        payment_id: payments.length + 1,
        order_id,
        amount_paid: total_amount,
        payment_method: seed.method,
        paid_at: ordered_at,
      });
    }
  });

  return { orders, order_items, payments };
}

export function createSeed(): PosDb {
  return {
    customers: CUSTOMERS,
    categories: CATEGORIES,
    products: PRODUCTS,
    discounts: DISCOUNTS,
    ...seedShift(new Date()),
  };
}
