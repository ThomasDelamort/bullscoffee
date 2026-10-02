import type { PaymentMethod } from "../types";
import { formatPeso, round2 } from "../utils/format";
import { cashSuggestions, PAYMENT_METHOD_LABELS } from "../utils/pricing";
import { buttonClass, INPUT_CLASS, segmentClass } from "./styles";

const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "e_wallet"];

interface PaymentFieldsProps {
  total: number;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
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
  tendered,
  onTenderedChange,
  labelClassName,
}: PaymentFieldsProps) {
  const cash = Number(tendered) || 0;

  return (
    <>
      <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.04] p-1">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => onMethodChange(m)}
            className={`${segmentClass(method === m)} py-1.5 text-sm`}
          >
            {PAYMENT_METHOD_LABELS[m]}
          </button>
        ))}
      </div>

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
