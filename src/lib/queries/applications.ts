import { SupabaseClient } from "@supabase/supabase-js";
import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
  DocType,
  FieldDefinition,
  FieldType,
} from "@/lib/types";

export type ApplicationInput = {
  company: string;
  position: string;
  link: string | null;
  date_applied: string;
  status: ApplicationStatus;
  custom_fields: Record<string, unknown>;
  source_text?: string | null;
};

export async function listApplications(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Application[];
}

export async function getApplication(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("applications").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Application;
}

export async function createApplication(supabase: SupabaseClient, userId: string, input: ApplicationInput) {
  const { data, error } = await supabase
    .from("applications")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as Application;
}

export async function updateApplication(supabase: SupabaseClient, id: string, input: Partial<ApplicationInput>) {
  const { data, error } = await supabase.from("applications").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Application;
}

export async function deleteApplication(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) throw error;
}

export async function listFieldDefinitions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("field_definitions")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FieldDefinition[];
}

export async function upsertFieldDefinition(
  supabase: SupabaseClient,
  userId: string,
  input: Partial<FieldDefinition> & {
    field_key: string;
    label: string;
    field_type: FieldType;
  }
) {
  const { data, error } = await supabase
    .from("field_definitions")
    .upsert(
      {
        user_id: userId,
        field_key: input.field_key,
        label: input.label,
        field_type: input.field_type,
        options: input.options ?? [],
        is_visible: input.is_visible ?? true,
        is_custom: input.is_custom ?? true,
        sort_order: input.sort_order ?? 99,
      },
      { onConflict: "user_id,field_key" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as FieldDefinition;
}

export async function deleteFieldDefinition(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("field_definitions").delete().eq("id", id).eq("is_custom", true);
  if (error) throw error;
}

export async function listDocuments(supabase: SupabaseClient, applicationId?: string) {
  let query = supabase.from("documents").select("*").order("uploaded_at", { ascending: false });
  if (applicationId) query = query.eq("application_id", applicationId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ApplicationDocument[];
}

export async function uploadDocument(
  supabase: SupabaseClient,
  userId: string,
  applicationId: string,
  file: File,
  docType: DocType
) {
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const filePath = `${userId}/${applicationId}/${Date.now()}-${safeName}`;
  const upload = await supabase.storage.from("application-documents").upload(filePath, file);
  if (upload.error) throw upload.error;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      application_id: applicationId,
      user_id: userId,
      file_name: file.name,
      file_path: filePath,
      doc_type: docType,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ApplicationDocument;
}

export async function getDocumentDownloadUrl(supabase: SupabaseClient, filePath: string) {
  const { data, error } = await supabase.storage
    .from("application-documents")
    .createSignedUrl(filePath, 60 * 5);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(supabase: SupabaseClient, document: ApplicationDocument) {
  const storage = await supabase.storage.from("application-documents").remove([document.file_path]);
  if (storage.error) throw storage.error;

  const { error } = await supabase.from("documents").delete().eq("id", document.id);
  if (error) throw error;
}
