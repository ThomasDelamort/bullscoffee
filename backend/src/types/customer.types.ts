export interface Customer {
    customer_id?: number;
    clerk_id: string;
    first_name: string;
    last_name: string;
    university_id: string | null;
    customer_email: string;
    contact_number: string | null;
    profile_picture: string | null;
    created_at?: Date;
}

// export type Order {

// }
