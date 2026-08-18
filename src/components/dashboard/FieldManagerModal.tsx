"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { deleteFieldDefinition, upsertFieldDefinition } from "@/lib/queries/applications";
import { FieldDefinition, FieldType } from "@/lib/types";

export function FieldManagerModal({ userId, fields, onClose }: { userId: string; fields: FieldDefinition[]; onClose: () => void }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [options, setOptions] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["fields"] });
  const upsertMutation = useMutation({ mutationFn: (field: Parameters<typeof upsertFieldDefinition>[2]) => upsertFieldDefinition(supabase, userId, field), onSuccess: refresh });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteFieldDefinition(supabase, id), onSuccess: refresh });

  function addField(event: FormEvent) {
    event.preventDefault();
    const fieldKey = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!fieldKey) return;
    upsertMutation.mutate({
      field_key: fieldKey,
      label: label.trim(),
      field_type: type,
      options: options.split(",").map((option) => option.trim()).filter(Boolean),
      is_custom: true,
      sort_order: fields.length + 1,
    });
    setLabel("");
    setOptions("");
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      >
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.99 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="cyber-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="mono-eyebrow mb-1 text-[10px] text-cyan/80">// schema</p>
              <h2 className="font-display text-xl font-semibold">Manage fields</h2>
              <p className="mt-0.5 text-sm text-muted">Hide fields without deleting their saved data.</p>
            </div>
            <button onClick={onClose} className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-muted transition-colors hover:border-rose-400/40 hover:text-rose-300">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[rgba(10,4,22,0.4)] p-3 transition-colors hover:border-purple-400/25"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{field.label}</p>
                  <p className="font-mono text-[11px] text-muted">
                    {field.field_key} · {field.field_type} · {field.is_custom ? "custom" : "built-in"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => upsertMutation.mutate({ ...field, is_visible: !field.is_visible })}
                    title={field.is_visible ? "Hide field" : "Show field"}
                  >
                    {field.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </Button>
                  {field.is_custom ? (
                    <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate(field.id)} title="Delete field">
                      <Trash2 size={15} />
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>

          <form onSubmit={addField} className="mt-5 grid gap-3 rounded-2xl border border-purple-400/20 bg-[rgba(10,4,22,0.4)] p-4 md:grid-cols-[1fr_150px]">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="New field label" className="rounded-xl border border-white/10 bg-[rgba(8,3,20,0.55)] px-3 py-2 text-sm outline-none transition hover:border-purple-400/35 focus:border-cyan/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.1)]" />
            <select value={type} onChange={(e) => setType(e.target.value as FieldType)} className="rounded-xl border border-white/10 bg-[rgba(8,3,20,0.55)] px-3 py-2 text-sm outline-none transition hover:border-purple-400/35 focus:border-cyan/50">
              {["text", "date", "select", "multiselect", "url", "number"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Options, comma-separated" className="rounded-xl border border-white/10 bg-[rgba(8,3,20,0.55)] px-3 py-2 text-sm outline-none transition hover:border-purple-400/35 focus:border-cyan/50 md:col-span-2" />
            <Button className="md:col-span-2" disabled={!label.trim()}>
              <Plus size={15} />
              Add custom field
            </Button>
          </form>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
