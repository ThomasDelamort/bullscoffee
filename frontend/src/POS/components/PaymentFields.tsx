import { describeMethods, type PaymongoMethod } from "../../checkout/api";
import type { Tender } from "../types";
import { formatPeso, round2 } from "../utils/format";
import { cashSuggestions, TENDER_LABELS } from "../utils/pricing";
import { buttonClass, INPUT_CLASS, segmentClass } from "./styles";

const COUNTER_TENDERS: readonly Tender[] = ["cash", "card", "e_wallet"];

interface PaymentFieldsProps {
  total: number;
  method: Tender;
  onMethodChange: (method: Tender) => void;
  /** What PayMongo checkout offers; empty when online payment is off, which hides the Online choice. */
  onlineMethods: PaymongoMethod[];
  /** Cash received, as typed. */
  tendered: string;
  onTenderedChange: (tendered: string) => void;
  labelClassName: string;
}

/** Payment method, plus the cash received and change when paying cash. */
export default function PaymentFields({
  total,
  method,
  onMethodChange,
  onlineMethods,
  tendered,
  onTenderedChange,
  labelClassName,
}: PaymentFieldsProps) {
  const cash = Number(tendered) || 0;
  const tenders = onlineMethods.length ? [...COUNTER_TENDERS, "online" as const] : COUNTER_TENDERS;

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Payment method"
        className={`grid gap-1 rounded-lg bg-white/[0.04] p-1 ${tenders.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}
      >
        {tenders.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => onMethodChange(m)}
            className={`${segmentClass(method === m)} py-1.5 text-sm`}
          >
            {TENDER_LABELS[m]}
          </button>
        ))}
      </div>

      {method === "online" && total > 0 && (
        <p className="text-xs text-(--pos-muted)">
          The customer pays with {describeMethods(onlineMethods)} on PayMongo's checkout page. The order shows as paid
          once PayMongo confirms it.
        </p>
      )}

      {method === "cash" && total > 0 && (
        <div className="space-y-2">
          <label className="block">
            <span className={labelClassName}>Cash received (₱)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={tendered}
              onChange={(e) => onTenderedChange(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {cashSuggestions(total).map((amount, i) => (
              <button
                key={amount}
                type="button"
                onClick={() => onTenderedChange(String(amount))}
                className={`${buttonClass("ghost", "sm")} bg-white/[0.03] px-1 font-medium tabular-nums`}
              >
                {i === 0 ? "Exact" : `₱${amount.toLocaleString("en-PH")}`}
              </button>
            ))}
          </div>
          {cash >= total && (
            <p className="flex justify-between text-sm">
              <span className="text-(--pos-muted)">Change</span>
              <span className="font-semibold tabular-nums">{formatPeso(round2(cash - total))}</span>
            </p>
          )}
        </div>
      )}
    </>
  );
}
