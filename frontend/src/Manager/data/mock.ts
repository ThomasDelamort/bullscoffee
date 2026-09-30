/**
 * Placeholder data for the manager UI, generated relative to today so the
 * dashboard and reports always have recent activity. A fixed seed keeps it
 * identical across reloads. Swap createSeed() for API calls once the backend
 * routes exist; every row already matches its table in init.sql.
 */
import type {
  AttendanceLog,
  Category,
  Customer,
  Delivery,
  DeliveryItem,
  Discount,
  Employee,
  EmployeeRole,
  EmployeeStatus,
  Feedback,
  Ingredient,
  ItemSize,
  ManagerDb,
  Order,
  OrderItem,
  Payment,
  PaymentMethod,
  Product,
  ProductIngredient,
  StockMovement,
  Supplier,
  SupplierIngredient,
} from "../types";
import { groupBy } from "../utils/collections";
import { addDays, dayKey, startOfDay } from "../utils/dates";
import { round2 } from "../utils/format";
import { discountFor, subtotalOf, unitPrice } from "../utils/pricing";
import { parseSchedule, worksOn } from "../utils/schedule";

/** The signed-in manager until auth is wired; stamps orders, stock moves and deliveries. */
export const CURRENT_EMPLOYEE_ID = 1;

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260930);
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;

function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1]![0];
}

const NOW = new Date();
const TODAY = startOfDay(NOW);

function at(daysAgo: number, hour: number, minute = 0): Date {
  const d = addDays(TODAY, -daysAgo);
  d.setHours(hour, minute, int(0, 59), 0);
  return d;
}

const minutesLater = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

/* ============================ STAFF ============================ */

function employee(
  employee_id: number,
  first_name: string,
  last_name: string,
  employee_role: EmployeeRole,
  work_schedule: string,
  contact_number: string | null,
  hiredDaysAgo: number,
  employee_status: EmployeeStatus = "active",
): Employee {
  return {
    employee_id,
    clerk_id: `user_seed_${employee_id}`,
    first_name,
    last_name,
    employee_email: `${first_name}.${last_name}@bullscoffee.ph`.toLowerCase().replace(/\s+/g, ""),
    contact_number,
    profile_picture: null,
    employee_status,
    employee_role,
    work_schedule,
    created_at: at(hiredDaysAgo, 9).toISOString(),
  };
}

const EMPLOYEES: Employee[] = [
  employee(1, "Andrea", "Villanueva", "manager", "Mon-Fri 08:00-17:00", "0917 555 0101", 420),
  employee(2, "Jessa", "Ramos", "cashier", "Mon-Fri 07:00-15:00", "0917 555 0102", 380),
  employee(3, "Paolo", "Santos", "cashier", "Mon-Fri 13:00-21:00", "0918 555 0103", 300),
  employee(4, "Bea", "Mendoza", "cashier", "Tue-Sat 07:00-15:00", "0919 555 0104", 260),
  employee(5, "Carlo", "Reyes", "cashier", "Sat,Sun 07:00-15:00", null, 200),
  employee(6, "Nina", "Castillo", "cashier", "Wed-Sun 13:00-21:00", "0920 555 0106", 120),
  employee(7, "Kevin", "Lim", "cashier", "Mon,Wed,Fri 09:00-17:00", "0921 555 0107", 500, "inactive"),
];

const ACTIVE_STAFF = EMPLOYEES.filter((e) => e.employee_status === "active").map((e) => ({
  employee: e,
  shift: parseSchedule(e.work_schedule),
}));

function attendanceLogs(): AttendanceLog[] {
  const logs: AttendanceLog[] = [];
  for (let daysAgo = 27; daysAgo >= 0; daysAgo--) {
    const day = addDays(TODAY, -daysAgo);
    for (const { employee: e, shift } of ACTIVE_STAFF) {
      if (!shift || !worksOn(shift, day)) continue;
      // About one missed shift in twenty.
      if (daysAgo > 0 && rand() < 0.05) continue;
      const [sh, sm] = shift.start.split(":").map(Number);
      const [eh, em] = shift.end.split(":").map(Number);
      // Mostly early or on time; roughly one in eight arrives past the grace period.
      const lateBy = rand() < 0.12 ? int(11, 35) : int(-12, 6);
      const timeIn = minutesLater(at(daysAgo, sh!, sm!), lateBy);
      const timeOut = minutesLater(at(daysAgo, eh!, em!), int(-5, 25));
      if (timeIn > NOW) continue;
      logs.push({
        log_id: logs.length + 1,
        employee_id: e.employee_id,
        time_in: timeIn.toISOString(),
        time_out: timeOut > NOW ? null : timeOut.toISOString(),
      });
    }
  }
  return logs;
}

/* ============================ SALES ============================ */

const CUSTOMER_ROWS: [string, string, string | null][] = [
  ["Mika", "Reyes", "2023-10421"],
  ["Joshua", "Garcia", "2022-08813"],
  ["Trisha", "Bautista", "2024-01177"],
  ["Enzo", "Flores", null],
  ["Camille", "Torres", "2021-05532"],
  ["Rafael", "Cruz", null],
  ["Isabel", "Navarro", "2023-11890"],
  ["Gab", "Fernandez", "2024-02265"],
  ["Lara", "Domingo", null],
  ["Miguel", "Santiago", "2022-07714"],
  ["Pia", "Aguilar", null],
  ["Nico", "Salazar", "2023-09048"],
];

const CUSTOMERS: Customer[] = CUSTOMER_ROWS.map(([first_name, last_name, university_id], i) => ({
  customer_id: i + 1,
  clerk_id: `user_seed_c${i + 1}`,
  first_name,
  last_name,
  university_id,
  customer_email: `${first_name}.${last_name}@${university_id ? "student.edu.ph" : "gmail.com"}`.toLowerCase(),
  contact_number: null,
  profile_picture: null,
  created_at: at(200 - i * 12, 10).toISOString(),
}));

const DISCOUNTS: Discount[] = [
  { discount_id: 1, discount_name: "Student", kind: "percent", value: 10, eligibility: "university_id", is_active: true },
  { discount_id: 2, discount_name: "Senior citizen", kind: "percent", value: 20, eligibility: "government_id", is_active: true },
  { discount_id: 3, discount_name: "PWD", kind: "percent", value: 20, eligibility: "government_id", is_active: true },
  { discount_id: 4, discount_name: "Loyalty reward", kind: "fixed", value: 50, eligibility: "none", is_active: true },
  { discount_id: 5, discount_name: "Opening week promo", kind: "percent", value: 15, eligibility: "none", is_active: false },
];

/* ============================= MENU ============================= */

const CATEGORIES: Category[] = [
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

const PRODUCTS: Product[] = PRODUCT_ROWS.map(([category_id, product_name, price, description, available], i) => ({
  product_id: i + 1,
  category_id,
  product_name,
  description,
  image_url: null,
  price,
  is_available: available ?? true,
  created_at: at(400 - i * 5, 9).toISOString(),
  has_sizes: DRINK_CATEGORIES.has(category_id),
}));

/* =========================== INVENTORY =========================== */

type IngredientRow = [string, string, number, number, boolean?];

const INGREDIENT_ROWS: IngredientRow[] = [
  ["Espresso beans", "g", 6400, 3000],
  ["Whole milk", "ml", 5200, 8000],
  ["Oat milk", "ml", 3100, 2000],
  ["Matcha powder", "g", 380, 500],
  ["Chocolate sauce", "ml", 2600, 1500],
  ["Caramel sauce", "ml", 1800, 1000],
  ["Vanilla syrup", "ml", 1500, 1000],
  ["Condensed milk", "ml", 2400, 1500],
  ["Mango purée", "ml", 2900, 2000],
  ["Strawberry purée", "ml", 0, 2000],
  ["Whipped cream", "g", 1800, 1000],
  ["Chocolate chips", "g", 900, 500],
  ["Frappé base", "g", 2600, 1500],
  ["Butter croissant", "pc", 14, 12],
  ["Blueberry muffin", "pc", 9, 12],
  ["Cheese ensaymada", "pc", 20, 10],
  ["Banana bread", "slice", 16, 10],
  ["Ham & cheese sandwich", "pc", 6, 8],
  ["Chocolate chip cookie", "pc", 32, 15],
  ["Hazelnut syrup", "ml", 0, 0, false],
];

const INGREDIENTS: Ingredient[] = INGREDIENT_ROWS.map(
  ([ingredient_name, unit_of_measure, current_quantity, minimum_stock_level, active], i) => ({
    ingredient_id: i + 1,
    ingredient_name,
    unit_of_measure,
    image_url: null,
    current_quantity,
    minimum_stock_level,
    is_active: active ?? true,
  }),
);

/** product_id → [ingredient_id, quantity_required][] */
const RECIPES: Record<number, [number, number][]> = {
  1: [[1, 18]],
  2: [[1, 18], [2, 240]],
  3: [[1, 18], [2, 180]],
  4: [[1, 18], [2, 220], [6, 30], [7, 15]],
  5: [[1, 18], [2, 200], [8, 30]],
  6: [[1, 18], [2, 200], [5, 30]],
  7: [[10, 60], [2, 180], [13, 30], [11, 20]],
  8: [[1, 18], [5, 40], [2, 150], [13, 30], [11, 20]],
  9: [[4, 8], [2, 180], [13, 30]],
  10: [[1, 18], [5, 30], [12, 20], [2, 150], [13, 30], [11, 20]],
  11: [[9, 90], [13, 30], [2, 100]],
  12: [[4, 6], [3, 240]],
  13: [[5, 45], [2, 220]],
  14: [[10, 50], [2, 220]],
  15: [[14, 1]],
  16: [[15, 1]],
  17: [[16, 1]],
  18: [[17, 1]],
  19: [[18, 1]],
  20: [[19, 1]],
};

const PRODUCT_INGREDIENTS: ProductIngredient[] = Object.entries(RECIPES).flatMap(([productId, rows]) =>
  rows.map(([ingredient_id, quantity_required]) => ({
    product_id: Number(productId),
    ingredient_id,
    quantity_required,
  })),
);

/* ============================ SUPPLY ============================ */

type SupplierRow = [string, string, string, string, string, boolean?];

const SUPPLIER_ROWS: SupplierRow[] = [
  ["Highland Beans Co.", "Rosa Aquino", "orders@highlandbeans.ph", "0917 800 1001", "Km. 5 Halsema Hwy, La Trinidad, Benguet"],
  ["DairyFresh PH", "Dennis Tan", "dennis@dairyfresh.ph", "0918 800 1002", "Brgy. San Jose, Lipa City, Batangas"],
  ["Kyoto Leaf Trading", "Aiko Tanaka", "sales@kyotoleaf.ph", "0917 800 1003", "Salcedo Village, Makati City"],
  ["Sweet Syrups Inc.", "Mark Villareal", "hello@sweetsyrups.ph", "0919 800 1004", "Brgy. Kapitolyo, Pasig City"],
  ["Fruit Basket Farms", "Grace Lopez", "orders@fruitbasket.ph", "0920 800 1005", "Brgy. Guadalupe, Cebu City"],
  ["Morning Bakes Bakery", "Jun Soriano", "jun@morningbakes.ph", "0921 800 1006", "Brgy. Poblacion, Makati City"],
  ["Metro Dairy Supply", "Liza Chua", "liza@metrodairy.ph", "0922 800 1007", "Brgy. Ugong, Valenzuela City", false],
];

const SUPPLIERS: Supplier[] = SUPPLIER_ROWS.map(
  ([supplier_name, contact_person, supplier_email, contact_number, supplier_address, active], i) => ({
    supplier_id: i + 1,
    supplier_name,
    contact_person,
    supplier_email,
    contact_number,
    image_url: null,
    supplier_address,
    is_active: active ?? true,
    created_at: at(500 - i * 30, 10).toISOString(),
  }),
);

/** [supplier_id, ingredient_id, unit_price, typical restock quantity] */
const SUPPLY_ROWS: [number, number, number, number][] = [
  [1, 1, 1.2, 5000],
  [2, 2, 0.09, 20000],
  [2, 3, 0.15, 6000],
  [2, 8, 0.12, 3000],
  [2, 11, 0.45, 2000],
  [3, 4, 4.8, 1000],
  [4, 5, 0.35, 3000],
  [4, 6, 0.38, 2000],
  [4, 7, 0.4, 2000],
  [4, 12, 0.6, 1000],
  [4, 13, 0.55, 3000],
  [5, 9, 0.28, 4000],
  [5, 10, 0.32, 4000],
  [6, 14, 38, 24],
  [6, 15, 32, 24],
  [6, 16, 28, 24],
  [6, 17, 30, 20],
  [6, 18, 62, 16],
  [6, 19, 18, 36],
  [7, 2, 0.1, 20000],
  [7, 3, 0.17, 6000],
];

const SUPPLIER_INGREDIENTS: SupplierIngredient[] = SUPPLY_ROWS.map(([supplier_id, ingredient_id, unit_price]) => ({
  supplier_id,
  ingredient_id,
  unit_price,
}));

/** Days between deliveries per supplier; inactive suppliers get none. */
const DELIVERY_EVERY: Record<number, number> = { 1: 7, 2: 3, 3: 14, 4: 7, 5: 5, 6: 2 };

/* ======================== GENERATED HISTORY ======================== */

const HISTORY_DAYS = 120;
const HOUR_WEIGHTS: [number, number][] = [
  [7, 6], [8, 10], [9, 8], [10, 6], [11, 7], [12, 8], [13, 7],
  [14, 6], [15, 8], [16, 7], [17, 6], [18, 5], [19, 4], [20, 3],
];
const POPULARITY: [number, number][] = [
  [1, 8], [2, 12], [3, 6], [4, 9], [5, 10], [6, 6], [7, 5], [8, 7], [9, 8], [10, 7],
  [11, 5], [12, 6], [13, 4], [15, 6], [16, 4], [17, 5], [18, 4], [19, 5], [20, 6],
];
const NOTES = ["Less ice", "Extra hot", "No sugar", "Extra shot", "Less sweet", "No whipped cream", "Oat milk"];
const PAYMENT_MIX: [PaymentMethod, number][] = [["cash", 55], ["e_wallet", 30], ["card", 15]];
const SIZE_MIX: [ItemSize, number][] = [["tall", 40], ["grade", 40], ["venti", 20]];
const STRAWBERRY_FRAPPE = 7;

interface SalesHistory {
  orders: Order[];
  order_items: OrderItem[];
  payments: Payment[];
}

function salesHistory(): SalesHistory {
  const orders: Order[] = [];
  const order_items: OrderItem[] = [];
  const payments: Payment[] = [];
  const productById = new Map(PRODUCTS.map((p) => [p.product_id, p]));
  const [student, senior] = DISCOUNTS;

  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const day = addDays(TODAY, -daysAgo);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const growth = 0.85 + 0.15 * (1 - daysAgo / HISTORY_DAYS);
    const count = Math.round((weekend ? 24 : 36) * between(0.8, 1.2) * growth);
    // Strawberry purée ran out, so it hasn't sold for the last couple of days.
    const menu = daysAgo < 2 ? POPULARITY.filter(([id]) => id !== STRAWBERRY_FRAPPE) : POPULARITY;

    const times = Array.from({ length: count }, () => at(daysAgo, weighted(HOUR_WEIGHTS), int(0, 59)))
      .filter((t) => t <= NOW)
      .sort((a, b) => a.getTime() - b.getTime());

    for (const t of times) {
      const order_id = orders.length + 1;
      const hour = t.getHours() + t.getMinutes() / 60;
      const onShift = ACTIVE_STAFF.filter(({ employee: e, shift }) => {
        if (e.employee_role !== "cashier" || !shift || !worksOn(shift, t)) return false;
        const [sh, sm] = shift.start.split(":").map(Number);
        const [eh, em] = shift.end.split(":").map(Number);
        return hour >= sh! + sm! / 60 && hour < eh! + em! / 60;
      });

      const lines = weighted([[1, 60], [2, 30], [3, 10]] as const);
      const items = Array.from({ length: lines }, (_, i): OrderItem => {
        const product = productById.get(weighted(menu))!;
        const size = product.has_sizes ? weighted(SIZE_MIX) : null;
        return {
          order_item_id: order_items.length + i + 1,
          order_id,
          product_id: product.product_id,
          quantity: rand() < 0.85 ? 1 : 2,
          size,
          selling_price: unitPrice(product, size),
          special_instructions: product.has_sizes && rand() < 0.1 ? pick(NOTES) : null,
        };
      });
      order_items.push(...items);

      const customer = rand() < 0.35 ? pick(CUSTOMERS) : null;
      const subtotal = subtotalOf(items);
      const discount =
        customer?.university_id && rand() < 0.3 ? student! : rand() < 0.03 ? senior! : null;
      const discount_amount = discount ? discountFor(discount, subtotal) : 0;
      const minutesAgo = (NOW.getTime() - t.getTime()) / 60_000;
      const order_status =
        minutesAgo < 12 ? "pending" : rand() < 0.03 ? "cancelled" : "completed";

      orders.push({
        order_id,
        customer_id: customer?.customer_id ?? null,
        employee_id: onShift.length ? pick(onShift).employee.employee_id : CURRENT_EMPLOYEE_ID,
        ordered_at: t.toISOString(),
        discount_amount,
        total_amount: round2(subtotal - discount_amount),
        order_status,
      });

      if (order_status !== "cancelled") {
        payments.push({
          payment_id: payments.length + 1,
          order_id,
          amount_paid: round2(subtotal - discount_amount),
          payment_method: weighted(PAYMENT_MIX),
          paid_at: minutesLater(t, 1).toISOString(),
        });
      }
    }
  }

  // Keep the order queue from ever demoing empty.
  if (!orders.some((o) => o.order_status === "pending")) {
    for (const o of orders.slice(-2)) o.order_status = "pending";
  }

  return { orders, order_items, payments };
}

interface SupplyHistory {
  deliveries: Delivery[];
  delivery_items: DeliveryItem[];
  stock_movements: StockMovement[];
}

function supplyHistory(sales: SalesHistory): SupplyHistory {
  const deliveries: Delivery[] = [];
  const delivery_items: DeliveryItem[] = [];
  const moves: Omit<StockMovement, "movement_id">[] = [];

  for (const supplier of SUPPLIERS) {
    const every = DELIVERY_EVERY[supplier.supplier_id];
    if (!every) continue;
    const rows = SUPPLY_ROWS.filter(([sid]) => sid === supplier.supplier_id);
    for (let daysAgo = 56 - (supplier.supplier_id % every); daysAgo >= 1; daysAgo -= every) {
      const when = at(daysAgo, 9, int(0, 50));
      const delivery_id = deliveries.length + 1;
      const receiver = pick([1, 2, 4]);
      deliveries.push({
        delivery_id,
        supplier_id: supplier.supplier_id,
        employee_id: receiver,
        delivery_date: dayKey(when),
      });
      for (const [, ingredient_id, unit_price, restock] of rows) {
        const quantity_received = Math.round(restock * between(0.8, 1.2));
        delivery_items.push({
          delivery_id,
          ingredient_id,
          quantity_received,
          unit_cost: round2(unit_price * between(0.97, 1.05)),
        });
        moves.push({
          ingredient_id,
          employee_id: receiver,
          quantity_change: quantity_received,
          reason: "delivery",
          moved_at: when.toISOString(),
        });
      }
    }
  }

  for (let i = 0; i < 16; i++) {
    const ingredient = pick([2, 11, 14, 15, 16, 17, 18, 19]);
    const perishable = ingredient >= 14;
    moves.push({
      ingredient_id: ingredient,
      employee_id: pick([1, 2, 3, 4]),
      quantity_change: -(perishable ? int(1, 4) : int(100, 600)),
      reason: "waste",
      moved_at: at(int(0, 29), int(15, 20), int(0, 59)).toISOString(),
    });
  }

  for (let i = 0; i < 6; i++) {
    const ingredient = pick([1, 2, 5, 6, 9, 13]);
    moves.push({
      ingredient_id: ingredient,
      employee_id: CURRENT_EMPLOYEE_ID,
      quantity_change: (rand() < 0.5 ? -1 : 1) * int(50, 400),
      reason: "adjustment",
      moved_at: at(int(1, 29), 20, int(30, 59)).toISOString(),
    });
  }

  // Sales deduct stock when an order is completed. Only the last few days are
  // generated so the movement log stays readable.
  const recent = TODAY.getTime() - 2 * 86_400_000;
  const itemsByOrder = groupBy(sales.order_items, (i) => i.order_id);
  for (const order of sales.orders) {
    if (order.order_status !== "completed" || new Date(order.ordered_at).getTime() < recent) continue;
    const usage = new Map<number, number>();
    for (const item of itemsByOrder.get(order.order_id) ?? []) {
      for (const [ingredient_id, qty] of RECIPES[item.product_id] ?? []) {
        usage.set(ingredient_id, (usage.get(ingredient_id) ?? 0) + qty * item.quantity);
      }
    }
    for (const [ingredient_id, used] of usage) {
      moves.push({
        ingredient_id,
        employee_id: order.employee_id,
        quantity_change: -used,
        reason: "sale",
        moved_at: minutesLater(new Date(order.ordered_at), 5).toISOString(),
      });
    }
  }

  const stock_movements = moves
    .filter((m) => new Date(m.moved_at) <= NOW)
    .sort((a, b) => a.moved_at.localeCompare(b.moved_at))
    .map((m, i) => ({ ...m, movement_id: i + 1 }));

  return { deliveries, delivery_items, stock_movements };
}

const COMMENTS: Record<Feedback["rating"], string[]> = {
  5: [
    "The Spanish latte is perfect, not too sweet. My go-to before class.",
    "Super friendly barista, and my order was ready in under five minutes.",
    "Java chip frappé is the best on campus, hands down.",
    "Love the matcha frappé! Smooth and not grassy at all.",
    "Clean tables, good music, great coffee. Will be back.",
    "Croissant was flaky and warm. Pairs great with the americano.",
  ],
  4: [
    "Great coffee but the line was long around 8 AM.",
    "Caramel macchiato was good, a bit too much ice though.",
    "Nice ambiance. Wish there were more outlets for laptops.",
    "Tasty mango frappé. Would love a less-sweet option.",
  ],
  3: [
    "Latte was lukewarm today. Usually it's better.",
    "Okay drinks but the Wi-Fi kept disconnecting.",
    "Waited 15 minutes for two drinks during lunch.",
  ],
  2: [
    "Got the wrong size. Ordered venti but received tall.",
    "Muffin tasted stale this morning.",
  ],
  1: [
    "Ordered a strawberry frappé but it was sold out after I paid. Had to wait for a refund.",
    "Cashier was rude when I asked about the student discount.",
  ],
};

function feedback(orders: Order[]): Feedback[] {
  const since = TODAY.getTime() - 45 * 86_400_000;
  const eligible = orders.filter(
    (o) => o.customer_id !== null && o.order_status === "completed" && new Date(o.ordered_at).getTime() >= since,
  );
  const chosen = Array.from({ length: 28 }, () => pick(eligible));
  return [...new Set(chosen)]
    .sort((a, b) => a.ordered_at.localeCompare(b.ordered_at))
    .map((order, i): Feedback => {
      // A few guaranteed low ratings so complaints always show up in the demo.
      const rating = i % 9 === 4 ? 2 : i % 13 === 8 ? 1 : weighted<Feedback["rating"]>([[5, 45], [4, 30], [3, 13], [2, 7], [1, 5]]);
      const created = minutesLater(new Date(order.ordered_at), int(30, 180));
      const ageDays = (NOW.getTime() - created.getTime()) / 86_400_000;
      return {
        feedback_id: i + 1,
        customer_id: order.customer_id,
        order_id: order.order_id,
        rating,
        comment: pick(COMMENTS[rating]),
        status: ageDays > 6 ? "reviewed" : "new",
        created_at: (created > NOW ? NOW : created).toISOString(),
      };
    });
}

export function createSeed(): ManagerDb {
  const sales = salesHistory();
  const supply = supplyHistory(sales);
  return {
    employees: EMPLOYEES,
    attendance_logs: attendanceLogs(),
    customers: CUSTOMERS,
    ...sales,
    categories: CATEGORIES,
    products: PRODUCTS,
    product_ingredients: PRODUCT_INGREDIENTS,
    ingredients: INGREDIENTS,
    suppliers: SUPPLIERS,
    supplier_ingredients: SUPPLIER_INGREDIENTS,
    ...supply,
    feedback: feedback(sales.orders),
    discounts: DISCOUNTS,
  };
}
