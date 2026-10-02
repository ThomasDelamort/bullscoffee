import { useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { MIN_CUSTOMER_SEARCH, useCustomerSearch } from "../api/catalog";
import type { Customer } from "../types";
import { fullName } from "../utils/format";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import { Spinner } from "./QueryState";
import { FOCUS_RING, INPUT_CLASS } from "./styles";

interface CustomerPickerProps {
  /** null is a guest. */
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  labelClassName: string;
}

/** Search-as-you-type over GET /customers/search, so the register never loads the whole customer table. */
export default function CustomerPicker({ value, onChange, labelClassName }: CustomerPickerProps) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const results = useCustomerSearch(useDebouncedValue(term));
  const searching = term.trim().length >= MIN_CUSTOMER_SEARCH;

  if (value) {
    return (
      <div>
        <span className={labelClassName}>Customer</span>
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] py-1.5 pr-1.5 pl-3 ring-1 ring-white/[0.08] ring-inset">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{fullName(value)}</p>
            <p className="truncate text-xs text-(--pos-muted)">
              {value.university_id ? `Student · ${value.university_id}` : value.customer_email}
            </p>
          </div>
          <button
            type="button"
            aria-label="Remove customer"
            title="Remove customer"
            onClick={() => onChange(null)}
            className={`grid size-7 shrink-0 place-items-center rounded-md text-(--pos-muted) hover:bg-white/[0.07] hover:text-(--pos-ink) ${FOCUS_RING}`}
          >
            <FiX aria-hidden className="size-3.5" />
          </button>
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
      <label>
        <span className={labelClassName}>Customer</span>
        <span className="relative block">
          <FiSearch aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-(--pos-muted)" />
          <input
            type="search"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Guest · search name, ID or email"
            autoComplete="off"
            className={`${INPUT_CLASS} pl-8 [&::-webkit-search-cancel-button]:hidden`}
          />
        </span>
      </label>
      {open && searching && (
        <ul className="pos-scroll absolute inset-x-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-lg bg-(--pos-raised) py-1 shadow-xl ring-1 ring-white/10">
          {results.data?.map((c) => (
            <li key={c.customer_id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-white/[0.06] ${FOCUS_RING}`}
              >
                <span className="font-medium">{fullName(c)}</span>
                {c.university_id && <span className="ml-1.5 text-xs text-(--pos-gold)">student</span>}
                <span className="block truncate text-xs text-(--pos-muted)">
                  {[c.university_id, c.customer_email].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
          {results.isFetching && !results.data && (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-(--pos-muted)">
              <Spinner className="size-3.5" /> Searching…
            </li>
          )}
          {results.error && <li className="px-3 py-2 text-sm text-red-300">{results.error.message}</li>}
          {results.data?.length === 0 && <li className="px-3 py-2 text-sm text-(--pos-muted)">No customers match.</li>}
        </ul>
      )}
    </div>
  );
}
