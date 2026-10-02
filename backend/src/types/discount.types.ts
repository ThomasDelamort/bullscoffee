export type DiscountKind = "percent" | "fixed";
/** What the cashier must check before the discount can be applied. */
export type DiscountEligibility = "none" | "university_id" | "government_id";

export interface DiscountRow {
  discount_id: number;
  discount_name: string;
  kind: DiscountKind;
  /** Percent off, or pesos off for a fixed discount. pg returns it as a string. */
  value: number | string;
  eligibility: DiscountEligibility;
  is_active: boolean;
}

export interface NewDiscount {
  discount_name: string;
  kind: DiscountKind;
  value: number;
  eligibility: DiscountEligibility;
  is_active: boolean;
}

export type DiscountChanges = Partial<NewDiscount>;
