export type CollectionStatus =
    | 'submitted'
    | 'assigned'
    | 'picked_up'
    | 'weighed'
    | 'verified'
    | 'completed'
    | 'rejected'
    | 'cancelled';

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links?: Array<{ url: string | null; label: string; active: boolean }>;
};

export type Region = {
    id: number;
    name: string;
    type?: 'village' | 'rw' | 'rt';
    parent_name?: string;
};

export type UserAddress = {
    id: number;
    label: string;
    address_line: string;
    postal_code?: string | null;
    region_id?: number | null;
    region_name?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_consent?: boolean;
    location_consent_at?: string | null;
    is_primary?: boolean;
    region?: { id: number; name: string; level?: string };
};

export type WasteType = {
    id: number;
    name: string;
    category:
        | string
        | {
              name: string;
              slug: string;
              is_hazardous?: boolean;
          };
    unit?: string;
    is_hazardous?: boolean;
    point_rate?: number | null;
};

export type CollectionItem = {
    id?: number;
    waste_type?: WasteType;
    waste_type_id?: number;
    estimated_weight?: number;
    verified_weight?: number | null;
};

export type StatusHistory = {
    id?: number;
    status?: CollectionStatus;
    to_status?: CollectionStatus;
    label?: string;
    note?: string | null;
    notes?: string | null;
    actor_name?: string | null;
    actor?: { id?: number; name: string } | null;
    created_at: string;
};

export type CollectionRequest = {
    id: number;
    request_number: string;
    status: CollectionStatus;
    method: 'pickup' | 'drop_off';
    desired_at?: string | null;
    address_snapshot?:
        | string
        | {
              label?: string;
              address_line?: string;
              postal_code?: string | null;
              region_id?: number | null;
          };
    region_name?: string;
    total_estimated_weight_kg?: number;
    total_verified_weight_kg?: number | null;
    notes?: string | null;
    items?: CollectionItem[];
    status_histories?: StatusHistory[];
    created_at: string;
};

export type EducationContent = {
    id: number;
    slug: string;
    title: string;
    excerpt?: string;
    body?: string;
    sanitized_html?: string;
    category?: string | { id?: number; name: string; slug: string };
    cover_url?: string | null;
    cover_path?: string | null;
    published_at?: string | null;
    reading_time?: number;
    author_name?: string;
    author?: { id?: number; name: string };
    source_url?: string | null;
    external_url?: string | null;
};

export type Program = {
    id: number;
    slug: string;
    type: 'ecopore' | 'ecocycle' | 'general';
    title: string;
    description?: string;
    objective?: string;
    objectives?: string;
    cover_url?: string | null;
    cover_path?: string | null;
    location?: string;
    location_name?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    registration_ends_at?: string | null;
    quota?: number | null;
    capacity?: number | null;
    registered_count?: number;
    status?: string;
    registration_status?: string | null;
    registrations?: Array<{
        id: number;
        status: string;
        registered_at?: string | null;
        cancelled_at?: string | null;
    }>;
    region?: string | { id?: number; name: string } | null;
    sessions?: ProgramSession[] | null;
};

export type Product = {
    id: number;
    slug: string;
    name: string;
    description?: string;
    category?: string | { id?: number; name: string; slug: string };
    program_type?: string;
    image_url?: string | null;
    images?: Array<{ path: string; url?: string | null }>;
    point_price: number;
    stock: number;
    is_active?: boolean;
};

export type CartItem = {
    product: Product;
    quantity: number;
    subtotal_points: number;
};

export type Redemption = {
    id: number;
    number: string;
    status: string;
    total_points: number;
    created_at: string;
};

export type ForumThread = {
    id: number;
    slug?: string;
    title: string;
    excerpt?: string;
    space_name?: string;
    author_name?: string;
    replies_count?: number;
    is_locked?: boolean;
    is_pinned?: boolean;
    updated_at: string;
    body?: string;
    posts_count?: number;
    space?: { id: number; name: string; slug?: string };
    user?: { id: number; name: string };
};

export type DashboardSummary = {
    role?: string;
    total_users?: number | null;
    total_collections?: number;
    verified_weight_kg: number;
    point_balance?: number;
    green_points?: number;
    impact_kg_co2e?: number;
    recycling_potential_kg?: number;
    pending_collections?: number;
    active_programs?: number;
    low_stock_products?: number | null;
};

export type PointTransaction = {
    id: number;
    type: 'earn' | 'redeem' | 'adjustment' | 'reversal' | 'expired';
    amount: number;
    balance_before?: number;
    balance_after: number;
    description?: string;
    reason?: string | null;
    reference_type?: string | null;
    reference_id?: number | string | null;
    created_at: string;
    occurred_at?: string;
};

export type ImpactFactorSet = {
    name: string;
    version: string;
    source?: string;
    source_name?: string;
    source_url?: string | null;
    effective_date?: string | null;
    methodology_notes?: string;
    is_demo?: boolean;
};

export type ImpactSummary = {
    verified_weight_kg: number;
    impact_kg_co2e?: number;
    carbon_kg_co2e?: number;
    recycling_potential_kg?: number;
    recyclable_kg?: number;
    calculations_count?: number;
};

export type ProgramSession = {
    id: number;
    title: string;
    description?: string | null;
    starts_at: string;
    ends_at?: string | null;
    location?: string | null;
    location_name?: string | null;
};

export type ForumSpace = {
    id: number;
    slug: string;
    name: string;
    description?: string;
    threads_count?: number;
    is_private?: boolean;
};

export type ForumPost = {
    id: number;
    body: string;
    author_name?: string;
    author_avatar?: string | null;
    created_at: string;
    is_author?: boolean;
    user_id?: number;
    user?: { id: number; name: string };
};
