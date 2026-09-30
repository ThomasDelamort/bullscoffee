export interface SupplierRow {
  supplier_id: number;
  supplier_name: string;
  contact_person: string | null;
  supplier_email: string;
  contact_number: string | null;
  image_url: string | null;
  supplier_address: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface NewSupplier {
  supplier_name: string;
  contact_person: string | null;
  supplier_email: string;
  contact_number: string | null;
  image_url: string | null;
  supplier_address: string | null;
  is_active: boolean;
}

export type SupplierChanges = Partial<NewSupplier>;

export interface SupplierPrice {
  ingredient_id: number;
  unit_price: number;
}

export interface SupplierPriceRow extends SupplierPrice {
  supplier_id: number;
  ingredient_name: string;
  unit_of_measure: string;
}
