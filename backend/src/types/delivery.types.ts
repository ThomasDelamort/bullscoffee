export interface DeliveryFilters {
  supplier_id?: number | undefined;
}

export interface NewDeliveryItem {
  ingredient_id: number;
  quantity_received: number;
  unit_cost: number;
}

export interface NewDelivery {
  supplier_id: number;
  employee_id: number;
  /** YYYY-MM-DD */
  delivery_date: string;
  items: NewDeliveryItem[];
}

export interface DeliveryRow {
  delivery_id: number;
  supplier_id: number;
  employee_id: number;
  delivery_date: Date;
  supplier_name: string;
  employee_name: string;
  item_count: number;
  total_cost: number;
}

export interface DeliveryItemRow extends NewDeliveryItem {
  delivery_id: number;
  ingredient_name: string;
  unit_of_measure: string;
}

export interface DeliveryDetails extends DeliveryRow {
  items: DeliveryItemRow[];
}