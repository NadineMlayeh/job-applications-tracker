"use client";

import { ChangeEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileArchive, Loader2, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { deleteDocument, getDocumentDownloadUrl, uploadDocument } from "@/lib/queries/applications";
import { Application, ApplicationDocument, DocType } from "@/lib/types";

export function DocumentsPanel({
  userId,
  application,
  documents,
  onClose,
}: {
  userId: string;
  application: Application;
  documents: ApplicationDocument[];
  onClose: () => void;
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState<DocType>("cv");
  const [error, setError] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["documents"] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(supabase, userId, application.id, file, docType),
    onSuccess: refresh,
    onError: (err) => setError(err instanceof Error ? err.message : "Upload failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (doc: ApplicationDocument) => deleteDocument(supabase, doc),
    onSuccess: refresh,
  });

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    uploadMutation.mutate(file);
    event.target.value = "";
  }

  async function download(filePath: string) {
    const url = await getDocumentDownloadUrl(supabase, filePath);
    window.open(url, "_blank");
  }

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 380, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 380, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-purple-400/20 bg-[rgba(18,8,38,0.92)] p-5 shadow-[-24px_0_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="mono-eyebrow mb-1 text-[10px] text-cyan/80">// attachments</p>
            <h2 className="font-display text-xl font-semibold">Files</h2>
            <p className="mt-0.5 text-sm text-muted">
              {application.company} — {application.position}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-muted transition-colors hover:border-rose-400/40 hover:text-rose-300">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-dashed border-purple-400/25 bg-[rgba(10,4,22,0.4)] p-4">
          <div className="mb-3 flex gap-2">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="flex-1 rounded-xl border border-white/10 bg-[rgba(8,3,20,0.55)] px-3 py-2 font-mono text-xs uppercase tracking-wider outline-none transition hover:border-purple-400/35 focus:border-cyan/50"
            >
              <option value="cv">CV</option>
              <option value="cover_letter">Cover letter</option>
              <option value="response">Response</option>
              <option value="other">Other</option>
            </select>
            <label className="btn-sheen relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-purple-400/40 bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--cyan)))] px-4 py-2.5 text-sm font-medium text-white shadow-[0_2px_18px_rgba(168,85,247,0.25),inset_0_1px_0_rgba(255,255,255,0.28)] transition hover:border-purple-300/60 hover:shadow-[0_2px_28px_rgba(168,85,247,0.42)] hover:brightness-110">
              {uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Upload
              <input type="file" className="sr-only" onChange={chooseFile} disabled={uploadMutation.isPending} />
            </label>
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="space-y-2">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
              <FileArchive className="mb-3 text-muted" size={28} />
              <p className="font-mono text-xs uppercase tracking-wider text-muted">No files attached yet</p>
            </div>
          ) : (
            documents.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[rgba(10,4,22,0.4)] p-3 transition-colors hover:border-cyan-400/25"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                    {doc.doc_type} · {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => download(doc.file_path)} title="Download">
                    <Download size={15} />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate(doc)} title="Delete">
                    <Trash2 size={15} />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
