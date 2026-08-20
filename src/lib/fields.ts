import { FieldDefinition } from "./types";

// Mirrors supabase/schema.sql's seed_default_fields(). Used as a fallback/default
// so the UI has something to render before the user's real field_definitions
// rows are fetched, and as the source of truth for what a "default" field is.
export const DEFAULT_FIELDS: Omit<FieldDefinition, "id" | "user_id">[] = [
  { field_key: "location", label: "Location", field_type: "text", options: [], is_visible: true, is_custom: false, sort_order: 1 },
  { field_key: "remote_type", label: "Type", field_type: "select", options: ["Remote", "Hybrid", "Onsite"], is_visible: true, is_custom: false, sort_order: 2 },
  { field_key: "source", label: "Application method", field_type: "select", options: ["LinkedIn", "Company Website", "Referral", "Email", "Other"], is_visible: true, is_custom: false, sort_order: 3 },
  { field_key: "cv_version", label: "CV Version", field_type: "text", options: [], is_visible: true, is_custom: false, sort_order: 4 },
  { field_key: "salary", label: "Salary", field_type: "text", options: [], is_visible: true, is_custom: false, sort_order: 5 },
  { field_key: "tech_stack", label: "Tech Stack", field_type: "multiselect", options: [], is_visible: true, is_custom: false, sort_order: 6 },
  { field_key: "experience_required", label: "Experience Required", field_type: "text", options: [], is_visible: true, is_custom: false, sort_order: 7 },
  { field_key: "contact_person", label: "Contact Person", field_type: "text", options: [], is_visible: true, is_custom: false, sort_order: 8 },
  { field_key: "email", label: "Contact Email", field_type: "email", options: [], is_visible: true, is_custom: false, sort_order: 9 },
  { field_key: "interview_date", label: "Interview Date", field_type: "date", options: [], is_visible: true, is_custom: false, sort_order: 10 },
  { field_key: "rejection_reason", label: "Rejection Reason", field_type: "text", options: [], is_visible: true, is_custom: false, sort_order: 11 },
  { field_key: "follow_up_date", label: "Follow-up Date", field_type: "date", options: [], is_visible: true, is_custom: false, sort_order: 12 },
  { field_key: "application_type", label: "Application", field_type: "select", options: ["Job", "PFE / Internship"], is_visible: true, is_custom: false, sort_order: 13 },
];
