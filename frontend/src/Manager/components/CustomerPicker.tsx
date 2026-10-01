import { useState } from "react";
import { FiX } from "react-icons/fi";
import { MIN_CUSTOMER_SEARCH, useCustomerSearch } from "../api/customers";
import type { Customer } from "../types";
import { fullName } from "../utils/format";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import Button from "./Button";
import { Spinner } from "./QueryState";
import SearchInput from "./SearchInput";
import { FOCUS_RING } from "./styles";

interface CustomerPickerProps {
  /** null is a walk-in. */
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
}

/** Search-as-you-type over GET /customers/search, so the POS never loads the whole customer table. */
export default function CustomerPicker({ value, onChange }: CustomerPickerProps) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const search = useDebouncedValue(term);
  const results = useCustomerSearch(search);
  const searching = term.trim().length >= MIN_CUSTOMER_SEARCH;

  if (value) {
    return (
      <div>
        <span className="mb-1.5 block text-xs font-medium">Customer</span>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-(--mgr-surface) px-3 py-1.5 ring-1 ring-(--mgr-line)">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{fullName(value)}</p>
            <p className="truncate text-xs text-(--mgr-muted)">{value.university_id ?? value.customer_email}</p>
          </div>
          <Button size="sm" variant="ghost" icon={FiX} onClick={() => onChange(null)}>
            Walk-in
          </Button>
        </div>
      </div>
    );
  }

  const pick = (customer: Customer) => {
    onChange(customer);
    setTerm("");
    setOpen(false);
  };

  return (
    <div className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <span className="mb-1.5 block text-xs font-medium">Customer</span>
      <SearchInput
        value={term}
        onChange={(v) => {
          setTerm(v);
          setOpen(true);
        }}
        placeholder="Walk-in · search name, ID or email"
      />
      {open && searching && (
        <ul className="absolute inset-x-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-lg bg-(--mgr-surface) py-1 shadow-lg ring-1 ring-(--mgr-line)">
          {results.data?.map((c) => (
            <li key={c.customer_id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-(--mgr-ink)/5 ${FOCUS_RING}`}
              >
                <span className="font-medium">{fullName(c)}</span>
                <span className="block text-xs text-(--mgr-muted)">
                  {[c.university_id, c.customer_email].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
          {results.isFetching && !results.data && (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-(--mgr-muted)">
              <Spinner /> Searching…
            </li>
          )}
          {results.error && <li className="px-3 py-2 text-sm text-red-700">{results.error.message}</li>}
          {results.data?.length === 0 && <li className="px-3 py-2 text-sm text-(--mgr-muted)">No customers match.</li>}
        </ul>
      )}
    </div>
  );
}
