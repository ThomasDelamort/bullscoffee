import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { StatusCodes } from "http-status-codes";
import { notify } from "../lib/notify.ts";
import { isOnlinePaymentReady } from "../lib/paymongo.ts";
import { isItemSize, unitPrice } from "../lib/pricing.ts";
import { getCustomerByClerkId } from "../providers/customer.provider.ts";
import { createOrder } from "../providers/order.provider.ts";
import { createCheckoutSession } from "../providers/payment.provider.ts";
import { getProductsByIds } from "../providers/product.provider.ts";
import { getPublicSettings } from "../providers/settings.provider.ts";
import type {
  ItemSize,
  NewOrderItem,
  OrderDetails,
} from "../types/order.types.ts";

// The kiosk's own limits (MAX_QUANTITY in kiosk/data/useCart.ts, the
// 200-character note box), so a request past them didn't come from the kiosk.
const MAX_LINES = 30;
const MAX_QUANTITY = 20;
const MAX_NOTE_LENGTH = 200;

interface KioskItem {
  product_id: number;
  quantity: number;
  size: ItemSize | null;
  special_instructions: string | null;
}

// Unlike the POS, the kiosk sends no selling_price: the route is public, so
// prices come from the products table instead.
const parseKioskItems = (items: unknown): KioskItem[] | undefined => {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    return undefined;
  }

  const parsed: KioskItem[] = [];
  for (const item of items) {
    const { product_id, quantity, size, special_instructions } = item ?? {};
    const note =
      typeof special_instructions === "string"
        ? special_instructions.trim()
        : special_instructions;
    if (
      !Number.isInteger(product_id) ||
      product_id < 1 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY ||
      !(size === undefined || size === null || isItemSize(size)) ||
      !(
        note === undefined ||
        note === null ||
        (typeof note === "string" && note.length <= MAX_NOTE_LENGTH)
      )
    ) {
      return undefined;
    }
    parsed.push({
      product_id,
      quantity,
      size: size ?? null,
      special_instructions: note || null,
    });
  }
  return parsed;
};

// Prices each line from the products table. When the menu has changed since
// the kiosk loaded it, answers a message to show the customer instead.
const priceItems = async (
  items: KioskItem[],
): Promise<NewOrderItem[] | string> => {
  const products = await getProductsByIds([
    ...new Set(items.map((item) => item.product_id)),
  ]);
  const byId = new Map(products.map((p) => [p.product_id, p]));

  const priced: NewOrderItem[] = [];
  for (const item of items) {
    const product = byId.get(item.product_id);
    if (!product) {
      return "Something in your order is no longer on the menu. Please remove it and try again.";
    }
    if (!product.is_available) {
      return `${product.product_name} just sold out. Please remove it and try again.`;
    }
    if (product.has_sizes !== (item.size !== null)) {
      return `${product.product_name} has changed. Please remove it and add it again.`;
    }
    priced.push({ ...item, selling_price: unitPrice(product.price, item.size) });
  }
  return priced;
};

// Signing in at the kiosk is optional. A customer_id in the body is never
// trusted on a public route; only the Clerk session can link an order.
const signedInCustomerId = async (req: Request): Promise<number | null> => {
  const { isAuthenticated, userId } = getAuth(req);
  if (!isAuthenticated || !userId) return null;
  const customer = await getCustomerByClerkId(userId);
  return customer?.customer_id ?? null;
};

// Only what the confirmation screen shows: no cashier, customer or payments.
const toReceipt = (order: OrderDetails) => ({
  order_id: order.order_id,
  ordered_at: order.ordered_at,
  total_amount: order.total_amount,
  items: order.items.map((item) => ({
    order_item_id: item.order_item_id,
    product_name: item.product_name,
    quantity: item.quantity,
    size: item.size,
    selling_price: item.selling_price,
    special_instructions: item.special_instructions,
  })),
});

// Paying online is a convenience at the kiosk: when checkout can't start, the
// order still stands and is paid at the counter like any other.
const startCheckout = async (order_id: number): Promise<string | null> => {
  if (!isOnlinePaymentReady()) return null;
  try {
    const result = await createCheckoutSession(order_id);
    return result.status === "created" ? result.checkout_url : null;
  } catch (error: any) {
    console.error(`Kiosk checkout for order #${order_id} failed:`, error);
    return null;
  }
};

// A kiosk order is pending and unpaid with no cashier. With pay_online, the
// answer carries a PayMongo checkout_url to send the customer to; otherwise
// (or when that can't start) they pay at the counter. Whoever completes it
// there becomes its cashier.
export const createKioskOrderHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // The admin Settings page can close the kiosk: for maintenance, or just
    // to stop self-ordering. The kiosk shows the same message on its own
    // (from /settings/public); this catches an order already on its way.
    const settings = await getPublicSettings();
    if (settings.maintenance_mode) {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ error: settings.maintenance_message });
      return;
    }
    if (!settings.online_ordering) {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        error: "Kiosk ordering is paused. Please order at the counter.",
      });
      return;
    }

    const items = parseKioskItems(req.body?.items);
    if (!items) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: `items must be 1 to ${MAX_LINES} lines, each a product_id and a quantity of 1 to ${MAX_QUANTITY}, with an optional size and special_instructions of up to ${MAX_NOTE_LENGTH} characters`,
      });
      return;
    }

    const priced = await priceItems(items);
    if (typeof priced === "string") {
      res.status(StatusCodes.CONFLICT).json({ error: priced });
      return;
    }

    const payOnline = req.body?.pay_online === true;
    const order = await createOrder({
      customer_id: await signedInCustomerId(req),
      employee_id: null,
      order_source: "kiosk",
      discount_id: null,
      discount_amount: 0,
      items: priced,
      order_status: "pending",
    });
    if (!order) throw new Error("Placed order could not be read back");
    notify("order.placed", order.order_id);

    const checkout_url = payOnline ? await startCheckout(order.order_id) : null;
    res.status(StatusCodes.CREATED).json({
      message: checkout_url
        ? "Order placed. Continue to payment."
        : "Order placed. Pay at the counter.",
      data: { ...toReceipt(order), checkout_url },
    });
  } catch (error: any) {
    console.error("createKioskOrderHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to place order" });
  }
};
