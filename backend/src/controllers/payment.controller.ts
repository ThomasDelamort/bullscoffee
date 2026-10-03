import type { Request, Response } from "express";
import { notify } from "../lib/notify.ts";
import { StatusCodes } from "http-status-codes";
import {
  isOnlinePaymentReady,
  isPaymongoConfigured,
  isPaymongoMethod,
  isWebhookConfigured,
  PaymongoError,
  paymongoMode,
  paymongoRequest,
  verifyWebhookSignature,
} from "../lib/paymongo.ts";
import {
  createCheckoutSession,
  getOrderPaymentStatus,
  getPaymentSettings,
  recordOnlinePayment,
  updatePaymentSettings,
  type PaymentSettings,
} from "../providers/payment.provider.ts";
import { recordActivity } from "../providers/activity.provider.ts";

// Public: whether the kiosk and the register should offer online payment.
export const getPaymentOptionsHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { enabled_methods } = await getPaymentSettings();
    res.status(StatusCodes.OK).json({
      message: "Payment options",
      data: {
        online: isOnlinePaymentReady() && enabled_methods.length > 0,
        methods: enabled_methods,
      },
    });
  } catch (error: any) {
    console.error("getPaymentOptionsHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch payment options" });
  }
};

// A hosted PayMongo checkout for a pending order's balance, for the register
// to send the customer to. The order is marked paid by the webhook.
export const createCheckoutSessionHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { order_id } = req.body ?? {};
    if (!Number.isInteger(order_id) || order_id < 1) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "order_id must be a whole number" });
      return;
    }
    if (!isOnlinePaymentReady()) {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        error: "Online payment isn't set up. Add the PayMongo keys to backend/.env.",
      });
      return;
    }

    const result = await createCheckoutSession(order_id);
    if (result.status === "created") {
      res.status(StatusCodes.CREATED).json({
        message: "Checkout started",
        data: { checkout_url: result.checkout_url, session_id: result.session_id },
      });
    } else if (result.status === "not_found") {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Order not found" });
    } else if (result.status === "not_pending") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: "Only pending orders can be paid" });
    } else if (result.status === "nothing_due") {
      res
        .status(StatusCodes.CONFLICT)
        .json({ error: `Order #${order_id} is already paid` });
    } else {
      res.status(StatusCodes.CONFLICT).json({
        error: "No online payment methods are switched on. Turn some on in the admin Payment Gateway page.",
      });
    }
  } catch (error: any) {
    console.error("createCheckoutSessionHandler failed:", error);
    if (error instanceof PaymongoError) {
      res
        .status(StatusCodes.BAD_GATEWAY)
        .json({ error: `PayMongo: ${error.message}` });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to start checkout" });
  }
};

// Public, for the checkout return page: whether the order has been paid yet.
export const getOrderPaymentStatusHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const order_id = Number(req.params["id"]);
    if (!Number.isInteger(order_id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid order ID" });
      return;
    }
    const status = await getOrderPaymentStatus(order_id);
    if (!status) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Order not found" });
      return;
    }
    res.status(StatusCodes.OK).json({ message: "Payment status", data: status });
  } catch (error: any) {
    console.error("getOrderPaymentStatusHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch payment status" });
  }
};

// The parts of a checkout_session.payment.paid event this reads.
interface PaymongoPayment {
  id?: string;
  attributes?: {
    amount?: number;
    status?: string;
    source?: { type?: string } | null;
  };
}

interface PaymongoEvent {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      data?: {
        id?: string;
        attributes?: {
          metadata?: { order_id?: string } | null;
          payment_method_used?: string | null;
          payments?: PaymongoPayment[];
        };
      };
    };
  };
}

// Registered in server.ts ahead of express.json(), since the signature is
// over the exact bytes PayMongo sent. Answers 2xx for anything it has dealt
// with or can't act on, and 5xx only when trying again could help (PayMongo
// retries those).
export const paymongoWebhookHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const rawBody: unknown = req.body;
  if (
    !Buffer.isBuffer(rawBody) ||
    !verifyWebhookSignature(rawBody, req.get("Paymongo-Signature"))
  ) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid signature" });
    return;
  }

  let event: PaymongoEvent;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid JSON" });
    return;
  }

  const type = event.data?.attributes?.type;
  // payment.failed and the like leave the order pending, as it already is.
  if (type !== "checkout_session.payment.paid") {
    res.status(StatusCodes.OK).json({ message: `Ignored ${type}` });
    return;
  }

  const session = event.data?.attributes?.data?.attributes;
  const order_id = Number(session?.metadata?.order_id);
  if (!Number.isInteger(order_id)) {
    console.warn(`PayMongo event ${event.data?.id} has no order_id in its metadata`);
    res.status(StatusCodes.OK).json({ message: "No order to update" });
    return;
  }

  try {
    for (const payment of session?.payments ?? []) {
      const { id, attributes } = payment;
      if (!id || attributes?.status !== "paid" || !attributes.amount) continue;

      const method = attributes.source?.type ?? session?.payment_method_used;
      const result = await recordOnlinePayment({
        order_id,
        // PayMongo amounts are in centavos.
        amount_paid: attributes.amount / 100,
        // GCash, Maya, GrabPay and QR Ph all count as e-wallet here.
        payment_method: method === "card" ? "card" : "e_wallet",
        paymongo_payment_id: id,
      });

      if (result.status === "recorded") notify("payment.received", order_id);
      if (result.status === "unknown_order") {
        console.warn(`PayMongo payment ${id} is for order #${order_id}, which doesn't exist`);
      } else if (result.status === "recorded" && result.order_status !== "pending") {
        console.warn(
          `PayMongo payment ${id} was taken for order #${order_id}, which is ${result.order_status}: refund it from the PayMongo dashboard`,
        );
      }
    }
    res.status(StatusCodes.OK).json({ message: "Payment recorded" });
  } catch (error: any) {
    console.error("paymongoWebhookHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to record payment" });
  }
};

// For the admin Payment Gateway page. Reports whether each key is set, never
// the keys themselves.
const gatewayStatus = (settings: PaymentSettings) => ({
  mode: paymongoMode(),
  secret_key_set: (process.env["PAYMONGO_SECRET_KEY"] ?? "").startsWith("sk_"),
  webhook_secret_set: isWebhookConfigured(),
  return_urls_set: Boolean(
    process.env["PAYMONGO_SUCCESS_URL"] && process.env["PAYMONGO_CANCEL_URL"],
  ),
  ...settings,
});

export const getGatewayHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const settings = await getPaymentSettings();
    res
      .status(StatusCodes.OK)
      .json({ message: "Payment gateway settings", data: gatewayStatus(settings) });
  } catch (error: any) {
    console.error("getGatewayHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch payment gateway settings" });
  }
};

export const updateGatewayHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { enabled_methods, send_email_receipt } = req.body ?? {};
    if (
      !(
        enabled_methods === undefined ||
        (Array.isArray(enabled_methods) && enabled_methods.every(isPaymongoMethod))
      ) ||
      !(send_email_receipt === undefined || typeof send_email_receipt === "boolean")
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "enabled_methods must be a list of gcash, paymaya, grab_pay, qrph and card, and send_email_receipt true or false",
      });
      return;
    }

    const settings = await updatePaymentSettings({
      ...(enabled_methods === undefined
        ? {}
        : { enabled_methods: [...new Set(enabled_methods as PaymentSettings["enabled_methods"])] }),
      ...(send_email_receipt === undefined ? {} : { send_email_receipt }),
    });
    recordActivity(req, res, {
      module: "Settings",
      action: `Saved payment gateway settings (methods: ${settings.enabled_methods.join(", ") || "none"}; email receipts ${settings.send_email_receipt ? "on" : "off"})`,
    });
    res
      .status(StatusCodes.OK)
      .json({ message: "Payment settings saved", data: gatewayStatus(settings) });
  } catch (error: any) {
    console.error("updateGatewayHandler failed:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to save payment gateway settings" });
  }
};

interface WebhookListResponse {
  data: {
    attributes: { url: string; status: string; events: string[] };
  }[];
}

// Checks the secret key against PayMongo, and lists the webhooks that would
// confirm a checkout payment, so a missing one shows up before a customer pays.
export const testGatewayHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!isPaymongoConfigured()) {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        error: "PAYMONGO_SECRET_KEY, PAYMONGO_SUCCESS_URL and PAYMONGO_CANCEL_URL must be set in backend/.env",
      });
      return;
    }
    const webhooks = await paymongoRequest<WebhookListResponse>("GET", "/webhooks");
    res.status(StatusCodes.OK).json({
      message: "Connected to PayMongo",
      data: {
        mode: paymongoMode(),
        webhooks: webhooks.data
          .filter((w) => w.attributes.events.includes("checkout_session.payment.paid"))
          .map((w) => ({ url: w.attributes.url, status: w.attributes.status })),
      },
    });
  } catch (error: any) {
    console.error("testGatewayHandler failed:", error);
    if (error instanceof PaymongoError) {
      res.status(StatusCodes.BAD_GATEWAY).json({
        error:
          error.status === StatusCodes.UNAUTHORIZED
            ? "PayMongo rejected the secret key. Check PAYMONGO_SECRET_KEY in backend/.env."
            : `PayMongo: ${error.message}`,
      });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to reach PayMongo" });
  }
};
