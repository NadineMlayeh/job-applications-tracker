"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createApplication, updateApplication } from "@/lib/queries/applications";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationStatus, ExtractedJobFields, FieldDefinition, STATUS_LABELS, STATUS_ORDER } from "@/lib/types";

type FormState = {
  company: string;
  position: string;
  link: string;
  date_applied: string;
  status: ApplicationStatus;
  custom_fields: Record<string, unknown>;
  source_text: string;
};

const STATUS_PILL: Record<ApplicationStatus, string> = {
  wishlist: "border-white/10 text-muted hover:border-white/25 hover:text-foreground",
  applied: "border-purple-400/30 text-purple-300 hover:border-purple-400/60 hover:shadow-[0_0_16px_rgba(168,85,247,0.2)]",
  oa_test: "border-cyan-400/30 text-cyan-300 hover:border-cyan-400/60 hover:shadow-[0_0_16px_rgba(34,211,238,0.2)]",
  interview: "border-amber-400/30 text-amber-300 hover:border-amber-400/60 hover:shadow-[0_0_16px_rgba(245,158,11,0.2)]",
  offer: "border-emerald-400/30 text-emerald-300 hover:border-emerald-400/60 hover:shadow-[0_0_16px_rgba(16,185,129,0.2)]",
  rejected: "border-rose-400/30 text-rose-300 hover:border-rose-400/60 hover:shadow-[0_0_16px_rgba(244,63,94,0.2)]",
  withdrawn: "border-white/10 text-muted hover:border-white/25 hover:text-foreground",
};

export function ApplicationFormModal({
  userId,
  fields,
  initialApplication,
  startWithAi,
  onClose,
}: {
  userId: string;
  fields: FieldDefinition[];
  initialApplication: Application | null;
  startWithAi: boolean;
  onClose: () => void;
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const visibleFields = useMemo(() => fields.filter((field) => field.is_visible).sort((a, b) => a.sort_order - b.sort_order), [fields]);
  const [aiOpen, setAiOpen] = useState(startWithAi);
  const [aiText, setAiText] = useState(initialApplication?.source_text ?? "");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [form, setForm] = useState<FormState>({
    company: initialApplication?.company ?? "",
    position: initialApplication?.position ?? "",
    link: initialApplication?.link ?? "",
    date_applied: initialApplication?.date_applied ?? new Date().toISOString().slice(0, 10),
    status: initialApplication?.status ?? "wishlist",
    custom_fields: initialApplication?.custom_fields ?? {},
    source_text: initialApplication?.source_text ?? "",
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        company: form.company.trim(),
        position: form.position.trim(),
        link: form.link.trim() || null,
        date_applied: form.date_applied,
        status: form.status,
        custom_fields: form.custom_fields,
        source_text: form.source_text || null,
      };

      return initialApplication
        ? updateApplication(supabase, initialApplication.id, payload)
        : createApplication(supabase, userId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      onClose();
    },
  });

  function setCustom(key: string, value: unknown) {
    setForm((current) => ({ ...current, custom_fields: { ...current.custom_fields, [key]: value } }));
  }

  function setIfEmpty(next: Partial<FormState>, key: string, value: string | null | undefined, filled: Set<string>) {
    if (value && !String(form[key as keyof FormState] ?? "").trim()) {
      (next as Record<string, unknown>)[key] = value;
      filled.add(key);
    }
  }

  async function extract() {
    setAiError(null);
    setExtracting(true);
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Extraction failed.");

      const extracted = data as ExtractedJobFields;
      const filled = new Set<string>();
      const next: Partial<FormState> = { source_text: aiText };
      setIfEmpty(next, "company", extracted.company, filled);
      setIfEmpty(next, "position", extracted.position, filled);

      const custom: Record<string, unknown> = {};
      assignCustom(custom, form.custom_fields, "location", extracted.location, filled);
      assignCustom(custom, form.custom_fields, "remote_type", formatRemoteType(extracted.remote_type), filled);
      assignCustom(custom, form.custom_fields, "tech_stack", extracted.tech_stack, filled);
      assignCustom(custom, form.custom_fields, "experience_required", extracted.experience_required, filled);
      assignCustom(custom, form.custom_fields, "salary", extracted.salary_range, filled);
      assignCustom(custom, form.custom_fields, "contact_person", extracted.contact_person, filled);
      assignCustom(custom, form.custom_fields, "source", extracted.source, filled);

      setForm((current) => ({
        ...current,
        ...next,
        custom_fields: Object.fromEntries(
          Object.entries({ ...current.custom_fields, ...custom }).filter(([, value]) => value !== "" && value !== null && value !== undefined)
        ),
      }));
      setAiFilled(filled);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Extraction failed. Manual entry still works.");
    } finally {
      setExtracting(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      >
        <motion.form
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.99 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onSubmit={submit}
          className="cyber-panel max-h-[92vh] w-full max-w-4xl overflow-y-auto p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="mono-eyebrow mb-1 text-[10px] text-cyan/80">{initialApplication ? "// edit record" : "// new record"}</p>
              <h2 className="font-display text-xl font-semibold">{initialApplication ? "Edit application" : "Add application"}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-muted transition-colors hover:border-rose-400/40 hover:text-rose-300">
              <X size={18} />
            </button>
          </div>

          <div className="mb-5 rounded-2xl border border-purple-400/20 bg-[rgba(10,4,22,0.4)] p-4">
            <button
              type="button"
              onClick={() => setAiOpen((value) => !value)}
              className="mb-3 flex items-center gap-2 text-sm font-medium text-purple-300 transition-colors hover:text-cyan-300"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-purple-400/30 bg-purple-500/10">
                <Bot size={14} />
              </span>
              Paste job post · AI autofill
            </button>
            {aiOpen ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid gap-3 overflow-hidden"
              >
                <textarea
                  value={aiText}
                  onChange={(event) => setAiText(event.target.value)}
                  rows={5}
                  placeholder="Paste the job description text here"
                  className="w-full resize-y rounded-xl border border-white/10 bg-[rgba(8,3,20,0.55)] px-3 py-2.5 text-sm outline-none transition focus:border-cyan/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.1)] placeholder:text-muted/60"
                />
                {aiError ? <p className="text-sm text-rose-300">{aiError}</p> : null}
                <div className="flex items-center gap-3">
                  <Button type="button" variant="secondary" onClick={extract} disabled={extracting}>
                    {extracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Extract fields
                  </Button>
                  {extracting ? <span className="font-mono text-xs text-cyan-300/80">analyzing post…</span> : null}
                </div>
              </motion.div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company" highlighted={aiFilled.has("company")} loading={extracting}>
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputClass(aiFilled.has("company"))} />
            </Field>
            <Field label="Position" highlighted={aiFilled.has("position")} loading={extracting}>
              <input required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputClass(aiFilled.has("position"))} />
            </Field>
            <Field label="Link">
              <input type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className={inputClass(false)} />
            </Field>
            <Field label="Date applied">
              <input type="date" value={form.date_applied} onChange={(e) => setForm({ ...form, date_applied: e.target.value })} className={inputClass(false)} />
            </Field>
          </div>

          <div className="mt-5">
            <span className="mono-eyebrow mb-2 block text-[10px] text-muted">Status</span>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((status) => {
                const active = form.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setForm({ ...form, status })}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] transition-all ${
                      active
                        ? "border-purple-400/60 bg-purple-500/15 text-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.25)]"
                        : STATUS_PILL[status]
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {visibleFields.map((field) => (
              <Field key={field.id} label={field.label} highlighted={aiFilled.has(field.field_key)} loading={extracting}>
                <DynamicInput field={field} value={form.custom_fields[field.field_key]} onChange={(value) => setCustom(field.field_key, value)} highlighted={aiFilled.has(field.field_key)} />
              </Field>
            ))}
          </div>

          {saveMutation.error ? <p className="mt-4 text-sm text-rose-300">{saveMutation.error.message}</p> : null}

          <div className="mt-6 flex justify-end gap-3 border-t border-white/[0.06] pt-5">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending || !form.company || !form.position}>
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Save application
            </Button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}

function DynamicInput({ field, value, onChange, highlighted }: { field: FieldDefinition; value: unknown; onChange: (value: unknown) => void; highlighted: boolean }) {
  const base = inputClass(highlighted);
  if (field.field_type === "select") {
    return (
      <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="">-</option>
        {field.options.map((option) => <option key={option}>{option}</option>)}
      </select>
    );
  }
  if (field.field_type === "multiselect") {
    return <input value={Array.isArray(value) ? value.join(", ") : String(value ?? "")} onChange={(e) => onChange(e.target.value.split(",").map((part) => part.trim()).filter(Boolean))} className={base} />;
  }
  return <input type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : field.field_type === "url" ? "url" : "text"} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={base} />;
}

function Field({ label, highlighted, loading, children }: { label: string; highlighted?: boolean; loading?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex items-center gap-2 text-muted">
        {label}
        {highlighted ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
            <Sparkles size={9} />
            AI
          </span>
        ) : null}
      </span>
      <div className={loading ? "rounded-xl shimmer-bg animate-shimmer" : undefined}>{children}</div>
    </label>
  );
}

function inputClass(highlighted: boolean) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
    highlighted
      ? "border-cyan-400/60 bg-[rgba(8,3,20,0.7)] shadow-[0_0_0_2px_rgba(34,211,238,0.12)]"
      : "border-white/10 bg-[rgba(8,3,20,0.55)] hover:border-purple-400/35 focus:border-cyan/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.1)]"
  }`;
}

function assignCustom(
  target: Record<string, unknown>,
  current: Record<string, unknown>,
  key: string,
  value: unknown,
  filled: Set<string>
) {
  const existing = current[key];
  const empty = Array.isArray(existing) ? existing.length === 0 : existing === null || existing === undefined || existing === "";
  if (empty && (Array.isArray(value) ? value.length : value)) {
    target[key] = value;
    filled.add(key);
  }
}

function formatRemoteType(value: ExtractedJobFields["remote_type"]) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
