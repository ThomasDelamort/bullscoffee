export interface Supplier {
    supplier_id?: number;
    supplier_name: string;
    contact_person: string | null;
    supplier_email: string;
    contact_number: string | null;
    supplier_address: string | null;
    is_active: boolean;
    created_at?: Date;
}
