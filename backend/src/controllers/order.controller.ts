import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getEmployeeByClerkId } from "../providers/employee.provider.ts";
import {
  cancelOrder,
  completeOrder,
  createOrder,
  getOrderById,
  getOrders,
} from "../providers/order.provider.ts";
import type {
  ItemSize,
  NewOrder,
  NewOrderItem,
  OrderDetails,
  OrderStatus,
  PaymentMethod,
} from "../types/order.types.ts";

const queryText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

// undefined when absent, NaN-or-fraction when present but not a whole number.
const queryInt = (value: unknown): number | undefined => {
  const text = queryText(value);
  return text === undefined ? undefined : Number(text);
};

const isDate = (value: string): boolean => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const isOrderStatus = (value: unknown): value is OrderStatus =>
  value === "pending" || value === "completed" || value === "cancelled";

const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  value === "cash" || value === "card" || value === "e_wallet";

const isItemSize = (value: unknown): value is ItemSize =>
  value === "tall" || value === "grade" || value === "venti";

const parseItems = (items: unknown): NewOrderItem[] | undefined => {
  if (!Array.isArray(items) || items.length === 0) return undefined;

  const parsed: NewOrderItem[] = [];
  for (const item of items) {
    const { product_id, quantity, size, selling_price, special_instructions } =
      item ?? {};
    if (
      !Number.isInteger(product_id) ||
      product_id < 1 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !(size === undefined || size === null || isItemSize(size)) ||
      typeof selling_price !== "number" ||
      !Number.isFinite(selling_price) ||
      selling_price < 0 ||
      !(
        special_instructions === undefined ||
        special_instructions === null ||
        typeof special_instructions === "string"
      )
    ) {
      return undefined;
    }
    parsed.push({
      product_id,
      quantity,
      size: size ?? null,
      selling_price,
      special_instructions: special_instructions?.trim() || null,
    });
  }
  return parsed;
};

export const getOrdersHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const status = queryText(req.query["status"]);
    const from = queryText(req.query["from"]);
    const to = queryText(req.query["to"]);
    const search = queryText(req.query["search"]);
    const employee_id = queryInt(req.query["employee_id"]);
    const customer_id = queryInt(req.query["customer_id"]);

    if (status !== undefined && !isOrderStatus(status)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "status must be pending, completed or cancelled",
      });
      return;
    }
    if (
      (from !== undefined && !isDate(from)) ||
      (to !== undefined && !isDate(to))
    ) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "from and to must be dates in YYYY-MM-DD format" });
      return;
    }
    if (
      (employee_id !== undefined && !Number.isInteger(employee_id)) ||
      (customer_id !== undefined && !Number.isInteger(customer_id))
    ) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "employee_id and customer_id must be whole numbers" });
      return;
    }

    const orders = await getOrders({
      status,
      from,
      to,
      employee_id,
      customer_id,
      search,
    });
    res
      .status(StatusCodes.OK)
      .json({ message: "Successfully fetched orders", data: orders });
  } catch (error: any) {
    console.error("getOrdersHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch orders" });
  }
};

// The order with its line items and payments.
export const getOrderByIdHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const order_id = Number(req.params["id"]);
    if (!Number.isInteger(order_id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid order ID" });
      return;
    }

    const order = await getOrderById(order_id);
    if (!order) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Order not found" });
      return;
    }
    res.status(StatusCodes.OK).json({ message: "Order found", data: order });
  } catch (error: any) {
    console.error("getOrderByIdHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch order by ID" });
  }
};

// The cashier on the order is the signed-in employee, and the total is worked
// out by the provider from the items, so neither can be sent by the client.
export const createOrderHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const employee = await getEmployeeByClerkId(res.locals["clerkId"]);
    if (employee?.employee_id === undefined) {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "Only employees can place orders" });
      return;
    }

    const { customer_id, discount_amount, items, payment, order_status } =
      req.body ?? {};
    const parsedItems = parseItems(items);
    const hasPayment = payment !== undefined && payment !== null;

    if (
      !parsedItems ||
      !(
        customer_id === undefined ||
        customer_id === null ||
        (Number.isInteger(customer_id) && customer_id > 0)
      ) ||
      !(
        discount_amount === undefined ||
        (typeof discount_amount === "number" &&
          Number.isFinite(discount_amount) &&
          discount_amount >= 0)
      ) ||
      (hasPayment &&
        (typeof payment.amount_paid !== "number" ||
          !Number.isFinite(payment.amount_paid) ||
          payment.amount_paid <= 0 ||
          !isPaymentMethod(payment.payment_method))) ||
      !(
        order_status === undefined ||
        order_status === null ||
        isOrderStatus(order_status)
      )
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error:
          "items (product_id, quantity, selling_price) are required, and customer_id, discount_amount, payment and order_status must be valid",
      });
      return;
    }

    const newOrder: NewOrder = {
      customer_id: customer_id ?? null,
      employee_id: employee.employee_id,
      discount_amount: discount_amount ?? 0,
      items: parsedItems,
      payment: hasPayment
        ? {
            amount_paid: payment.amount_paid,
            payment_method: payment.payment_method,
          }
        : undefined,
      order_status: order_status ?? undefined,
    };

    const order = await createOrder(newOrder);
    res
      .status(StatusCodes.CREATED)
      .json({ message: "Successfully placed order", data: order });
  } catch (error: any) {
    console.error("createOrderHandler failed:", error);
    // Foreign key violation: the product or customer doesn't exist
    if (error?.code === "23503") {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Unknown product or customer" });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to place order" });
  }
};

// Only a pending order can move on. The provider answers undefined for both
// "no such order" and "not pending", so look the order up to tell them apart.
const changeOrderStatus = async (
  req: Request,
  res: Response,
  transition: (order_id: number) => Promise<OrderDetails | void>,
  status: "completed" | "cancelled",
): Promise<void> => {
  try {
    const order_id = Number(req.params["id"]);
    if (!Number.isInteger(order_id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid order ID" });
      return;
    }

    const order = await transition(order_id);
    if (order) {
      res
        .status(StatusCodes.OK)
        .json({ message: `Order ${status}`, data: order });
      return;
    }

    const existing = await getOrderById(order_id);
    if (!existing) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Order not found" });
      return;
    }
    res
      .status(StatusCodes.CONFLICT)
      .json({ error: `Only pending orders can be ${status}` });
  } catch (error: any) {
    console.error(`changeOrderStatus (${status}) failed:`, error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: `Failed to update order` });
  }
};

export const completeOrderHandler = (
  req: Request,
  res: Response,
): Promise<void> => changeOrderStatus(req, res, completeOrder, "completed");

export const cancelOrderHandler = (
  req: Request,
  res: Response,
): Promise<void> => changeOrderStatus(req, res, cancelOrder, "cancelled");
