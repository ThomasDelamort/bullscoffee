import type { PaymentMethod } from "../types";
import { formatPeso, round2 } from "../utils/format";
import Button from "./Button";
import { Field, Input } from "./Field";
import { PAYMENT_METHOD_LABELS } from "./status";
import { FOCUS_RING } from "./styles";

const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "e_wallet"];

interface PaymentFieldsProps {
  /** What's being charged. */
  total: number;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  /** Cash received, as typed. */
  tendered: string;
  onTenderedChange: (tendered: string) => void;
}

/** How the customer pays; for cash, what they handed over and their change. Shared by the register and the queue. */
export default function PaymentFields({ total, method, onMethodChange, tendered, onTenderedChange }: PaymentFieldsProps) {
  const cash = Number(tendered) || 0;

  return (
    <>
      <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-1 rounded-xl bg-(--mgr-ink)/5 p-1">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => onMethodChange(m)}
            className={`rounded-lg py-1.5 text-sm font-medium ${FOCUS_RING} ${
              method === m ? "bg-(--mgr-surface) shadow-sm" : "text-(--mgr-muted) hover:text-(--mgr-ink)"
            }`}
          >
            {PAYMENT_METHOD_LABELS[m]}
          </button>
        ))}
      </div>

      {method === "cash" && total > 0 && (
        <div className="flex items-end gap-2">
          <Field label="Cash received (₱)" className="flex-1">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={tendered}
              onChange={(e) => onTenderedChange(e.target.value)}
            />
          </Field>
          <Button size="md" onClick={() => onTenderedChange(String(total))}>
            Exact
          </Button>
        </div>
      )}
      {method === "cash" && cash >= total && total > 0 && (
        <p className="text-sm">
          Change: <span className="font-semibold tabular-nums">{formatPeso(round2(cash - total))}</span>
        </p>
      )}
    </>
  );
}
