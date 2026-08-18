export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "oa_test"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  oa_test: "QA / Test",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "wishlist",
  "applied",
  "oa_test",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export type FieldType = "text" | "date" | "select" | "multiselect" | "url" | "number";

export interface FieldDefinition {
  id: string;
  user_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  options: string[];
  is_visible: boolean;
  is_custom: boolean;
  sort_order: number;
}

export interface Application {
  id: string;
  user_id: string;
  company: string;
  position: string;
  link: string | null;
  date_applied: string; // ISO date
  status: ApplicationStatus;
  custom_fields: Record<string, unknown>;
  source_text: string | null;
  created_at: string;
  updated_at: string;
}

export type DocType = "cv" | "cover_letter" | "response" | "other";

export interface ApplicationDocument {
  id: string;
  application_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  doc_type: DocType;
  uploaded_at: string;
}

// Shape returned by the /api/extract AI endpoint
export interface ExtractedJobFields {
  company: string | null;
  position: string | null;
  location: string | null;
  remote_type: "remote" | "hybrid" | "onsite" | null;
  tech_stack: string[];
  experience_required: string | null;
  salary_range: string | null;
  contact_person: string | null;
  source: string | null;
}
