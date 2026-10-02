import type { Receipt } from "../pages/Confirmation";

const KEY = "bulls:kiosk-checkout";

/*
 * The receipt of an order the customer left the kiosk to pay for online.
 * PayMongo sends them back to /checkout in the same tab, so sessionStorage
 * carries it across. Storage can be blocked; the return page then shows the
 * order number without the lines.
 */

export function saveCheckoutReceipt(receipt: Receipt): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(receipt));
  } catch {
    // The return page manages without it.
  }
}

/** The saved receipt, if it's for this order. */
export function loadCheckoutReceipt(orderId: number): Receipt | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const receipt = raw ? (JSON.parse(raw) as Receipt) : null;
    return receipt?.order_id === orderId ? receipt : null;
  } catch {
    return null;
  }
}

export function clearCheckoutReceipt(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
