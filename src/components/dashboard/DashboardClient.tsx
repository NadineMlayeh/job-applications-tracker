"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Activity,
  CalendarClock,
  Command,
  ExternalLink,
  KanbanSquare,
  LayoutList,
  LogOut,
  Paperclip,
  Plus,
  Radar,
  Search,
  Settings2,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { DEFAULT_FIELDS } from "@/lib/fields";
import {
  deleteApplication,
  listApplications,
  listDocuments,
  listFieldDefinitions,
  updateApplication,
} from "@/lib/queries/applications";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationDocument, FieldDefinition, STATUS_LABELS, STATUS_ORDER } from "@/lib/types";
import { ApplicationFormModal } from "./ApplicationFormModal";
import { FieldManagerModal } from "./FieldManagerModal";
import { DocumentsPanel } from "./DocumentsPanel";
import { CommandPalette } from "./CommandPalette";

type ModalMode = "manual" | "ai";

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const COLUMN_ACCENT: Record<Application["status"], { bar: string; ring: string; count: string }> = {
  wishlist: { bar: "bg-white/30", ring: "hover:border-white/20", count: "text-muted" },
  applied: { bar: "bg-purple-400", ring: "hover:border-purple-400/40", count: "text-purple-300" },
  oa_test: { bar: "bg-cyan-400", ring: "hover:border-cyan-400/40", count: "text-cyan-300" },
  interview: { bar: "bg-amber-400", ring: "hover:border-amber-400/40", count: "text-amber-300" },
  offer: { bar: "bg-emerald-400", ring: "hover:border-emerald-400/40", count: "text-emerald-300" },
  rejected: { bar: "bg-rose-400", ring: "hover:border-rose-400/40", count: "text-rose-300" },
  withdrawn: { bar: "bg-white/30", ring: "hover:border-white/20", count: "text-muted" },
};

const STATUS_DOT: Record<Application["status"], string> = {
  wishlist: "bg-white/40",
  applied: "bg-purple-400",
  oa_test: "bg-cyan-400",
  interview: "bg-amber-400",
  offer: "bg-emerald-400",
  rejected: "bg-rose-400",
  withdrawn: "bg-white/40",
};

export function DashboardClient({ user }: { user: User }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Application["status"] | "all">("all");
  const [starredOnly, setStarredOnly] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editing, setEditing] = useState<Application | null>(null);
  const [managingFields, setManagingFields] = useState(false);
  const [documentsFor, setDocumentsFor] = useState<Application | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  const fieldsQuery = useQuery({
    queryKey: ["fields"],
    queryFn: async () => {
      const rows = await listFieldDefinitions(supabase);
      const merged = rows.map((row) => {
        const fallback = DEFAULT_FIELDS.find((field) => field.field_key === row.field_key);
        return fallback && row.options.length === 0 ? { ...row, options: fallback.options } : row;
      });
      const missingDefaults = DEFAULT_FIELDS.filter(
        (field) => !merged.some((row) => row.field_key === field.field_key)
      ).map((field) => ({
        ...field,
        id: `default-${field.field_key}`,
        user_id: user.id,
      }));
      return [...merged, ...missingDefaults] as FieldDefinition[];
    },
  });

  const appsQuery = useQuery({ queryKey: ["applications"], queryFn: () => listApplications(supabase) });
  const docsQuery = useQuery({ queryKey: ["documents"], queryFn: () => listDocuments(supabase) });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Application["status"] }) => updateApplication(supabase, id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  const starMutation = useMutation({
    mutationFn: (app: Application) =>
      updateApplication(supabase, app.id, {
        custom_fields: {
          ...app.custom_fields,
          starred: !isStarred(app),
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApplication(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const applications = appsQuery.data ?? [];
  const fields = fieldsQuery.data ?? [];
  const visibleFields = fields.filter((field) => field.is_visible).sort((a, b) => a.sort_order - b.sort_order);
  const documents = docsQuery.data ?? [];
  const docCounts = countDocuments(documents);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return applications.filter((app) => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (starredOnly && !isStarred(app)) return false;
      if (!needle) return true;
      return [app.company, app.position, app.status, ...Object.values(app.custom_fields ?? {}).flat()]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [applications, search, statusFilter, starredOnly]);

  const statusCounts = useMemo(() => {
    const counts = new Map<Application["status"], number>();
    for (const app of applications) counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
    return counts;
  }, [applications]);

  const stats = useMemo(() => {
    const interviews = applications.filter((app) => app.status === "interview" || app.status === "offer").length;
    return {
      total: applications.length,
      responseRate: applications.length ? Math.round((interviews / applications.length) * 100) : 0,
      interviews,
    };
  }, [applications]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const loading = appsQuery.isLoading || fieldsQuery.isLoading;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <motion.header
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            Mission control
          </p>
          <h1 className="text-3xl font-semibold tracking-tight neon-heading sm:text-4xl">Applications</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="group relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-cyan" size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="h-10 w-48 rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 font-mono text-sm text-foreground outline-none backdrop-blur transition-all placeholder:text-muted/70 focus:w-64 focus:border-cyan/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.1),0_0_24px_rgba(34,211,238,0.12)]"
            />
          </div>
          <Button variant="secondary" onClick={() => setCommandOpen(true)} title="Command palette (Ctrl+K)">
            <Command size={16} />
          </Button>
          <Button variant="secondary" onClick={() => setManagingFields(true)}>
            <Settings2 size={16} />
            Fields
          </Button>
          <Button variant="secondary" onClick={() => setView(view === "table" ? "kanban" : "table")}>
            {view === "table" ? <KanbanSquare size={16} /> : <LayoutList size={16} />}
            {view === "table" ? "Kanban" : "Table"}
          </Button>
          <Button variant="secondary" onClick={() => setModalMode("ai")}>
            <Sparkles size={16} className="text-purple-300" />
            Paste job post
          </Button>
          <Button onClick={() => setModalMode("manual")}>
            <Plus size={16} />
            Add
          </Button>
          <Button variant="ghost" onClick={signOut} title={user.email ?? "Sign out"}>
            <LogOut size={16} />
          </Button>
        </div>
      </motion.header>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mb-6 grid gap-3 sm:grid-cols-3"
      >
        <StatCard icon={<Radar size={18} />} label="Applications tracked" value={stats.total} accent="purple" />
        <StatCard icon={<Activity size={18} />} label="Response rate" value={`${stats.responseRate}%`} accent="cyan" />
        <StatCard icon={<CalendarClock size={18} />} label="Active interviews" value={stats.interviews} accent="magenta" />
      </motion.section>

      {applications.length > 0 && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="mb-5 flex flex-wrap items-center gap-2"
        >
          <button
            onClick={() => setStatusFilter("all")}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === "all"
                ? "border-purple-400/50 bg-purple-500/15 text-foreground shadow-[0_0_18px_rgba(168,85,247,0.2)]"
                : "border-white/10 bg-white/[0.03] text-muted hover:border-white/25 hover:text-foreground"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            All
            <span className="text-[10px] opacity-70">{applications.length}</span>
          </button>
          <button
            onClick={() => setStarredOnly((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              starredOnly
                ? "border-cyan-400/50 bg-cyan-500/15 text-foreground shadow-[0_0_18px_rgba(34,211,238,0.2)]"
                : "border-white/10 bg-white/[0.03] text-muted hover:border-white/25 hover:text-foreground"
            }`}
          >
            <Star size={13} className={starredOnly ? "fill-cyan-300 text-cyan-300" : ""} />
            Starred
            <span className="text-[10px] opacity-70">{applications.filter(isStarred).length}</span>
          </button>
          {STATUS_ORDER.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-purple-400/50 bg-purple-500/15 text-foreground shadow-[0_0_18px_rgba(168,85,247,0.2)]"
                    : "border-white/10 bg-white/[0.03] text-muted hover:border-white/25 hover:text-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
                {STATUS_LABELS[status]}
                <span className="text-[10px] opacity-70">{statusCounts.get(status) ?? 0}</span>
              </button>
            );
          })}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={loading ? "loading" : filtered.length === 0 ? "empty" : view}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-16 rounded-2xl border border-white/5 shimmer-bg animate-shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            applications.length === 0 ? (
              <section className="cyber-panel flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-500/10 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
                  <Sparkles className="text-purple-300" size={30} />
                </div>
                <h2 className="text-xl font-semibold">Your tracker is ready</h2>
                <p className="mt-2 max-w-md text-sm text-muted">Paste a job post and let AI fill the first application, or add one manually.</p>
                <div className="mt-6 flex gap-3">
                  <Button variant="secondary" onClick={() => setModalMode("ai")}>
                    <Sparkles size={16} />
                    Paste job post
                  </Button>
                  <Button onClick={() => setModalMode("manual")}>
                    <Plus size={16} />
                    Add application
                  </Button>
                </div>
              </section>
            ) : (
              <section className="cyber-panel flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Search className="text-muted" size={24} />
                </div>
                <h2 className="text-lg font-semibold">No matching applications</h2>
                <p className="mt-2 max-w-md text-sm text-muted">Nothing matches your current search and status filter.</p>
                <div className="mt-6">
                  <Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                    <X size={16} />
                    Clear filters
                  </Button>
                </div>
              </section>
            )
          ) : view === "table" ? (
            <ApplicationTable
              applications={filtered}
              onToggleStar={(app) => starMutation.mutate(app)}
              onEdit={setEditing}
              onDelete={(app) => deleteMutation.mutate(app.id)}
            />
          ) : (
            <KanbanBoard
              applications={filtered}
              docCounts={docCounts}
              onToggleStar={(app) => starMutation.mutate(app)}
              onDrop={(id, status) => statusMutation.mutate({ id, status })}
              onEdit={setEditing}
              onDocuments={setDocumentsFor}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {(modalMode || editing) && (
        <ApplicationFormModal
          userId={user.id}
          fields={fields}
          initialApplication={editing}
          startWithAi={modalMode === "ai"}
          onClose={() => {
            setModalMode(null);
            setEditing(null);
          }}
        />
      )}

      {managingFields ? <FieldManagerModal userId={user.id} fields={fields} onClose={() => setManagingFields(false)} /> : null}

      {documentsFor ? (
        <DocumentsPanel
          userId={user.id}
          application={documentsFor}
          documents={documents.filter((doc) => doc.application_id === documentsFor.id)}
          onClose={() => setDocumentsFor(null)}
        />
      ) : null}

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        actions={[
          { label: "Add application", run: () => setModalMode("manual") },
          { label: "Paste job post", run: () => setModalMode("ai") },
          { label: "Manage fields", run: () => setManagingFields(true) },
          { label: starredOnly ? "Show all jobs" : "Show starred jobs", run: () => setStarredOnly((value) => !value) },
          { label: view === "table" ? "Switch to Kanban" : "Switch to Table", run: () => setView(view === "table" ? "kanban" : "table") },
        ]}
      />
    </main>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent: "purple" | "cyan" | "magenta" }) {
  const accents = {
    purple: {
      iconWrap: "border-purple-400/30 bg-purple-500/10 text-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.2)]",
      value: "text-glow-purple",
      glow: "group-hover:shadow-[0_0_34px_rgba(168,85,247,0.4)]",
      edge: "via-purple-400/70",
    },
    cyan: {
      iconWrap: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.2)]",
      value: "text-glow-cyan",
      glow: "group-hover:shadow-[0_0_34px_rgba(34,211,238,0.4)]",
      edge: "via-cyan-400/70",
    },
    magenta: {
      iconWrap: "border-magenta/30 bg-magenta/10 text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.2)]",
      value: "text-glow-purple",
      glow: "group-hover:shadow-[0_0_34px_rgba(244,63,94,0.4)]",
      edge: "via-rose-400/70",
    },
  }[accent];

  return (
    <motion.div variants={itemVariants} className="cyber-panel group relative overflow-hidden p-4">
      <span className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100 ${accents.edge}`} />
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${accents.iconWrap} ${accents.glow}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className={`font-display text-2xl font-semibold leading-tight ${accents.value}`}>{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ApplicationTable({
  applications,
  onToggleStar,
  onEdit,
  onDelete,
}: {
  applications: Application[];
  onToggleStar: (app: Application) => void;
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
}) {
  return (
    <div className="cyber-panel overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.07] bg-white/[0.02]">
            {["Company name", "Position", "Date applied", "Location", "Type", "Tech stack", "Method", "Status", ""].map((heading, index) => (
              <th key={index} className="px-5 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
                {heading === "" ? <span className="block text-right">Actions</span> : heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="group relative border-b border-white/[0.05] transition-colors last:border-0 even:bg-white/[0.015] hover:bg-white/[0.03]">
              <td className="px-5 py-4">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <button
                    onClick={() => onToggleStar(app)}
                    className={`rounded-lg p-1 transition-colors ${
                      isStarred(app) ? "text-cyan-300" : "text-muted hover:text-cyan-300"
                    }`}
                    title={isStarred(app) ? "Unstar job" : "Star job"}
                  >
                    <Star size={15} className={isStarred(app) ? "fill-cyan-300" : ""} />
                  </button>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-purple-400/25 bg-purple-500/10 font-display text-[11px] font-semibold text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]">
                    {app.company.charAt(0).toUpperCase()}
                  </span>
                  {app.company}
                </span>
              </td>
              <td className="px-5 py-4 text-muted">{app.position}</td>
              <td className="px-5 py-4 font-mono text-[13px] text-muted">{app.date_applied}</td>
              <td className="max-w-[180px] truncate px-5 py-4 text-muted">
                {formatField(app.custom_fields?.location)}
              </td>
              <td className="px-5 py-4 text-muted">{formatField(app.custom_fields?.remote_type)}</td>
              <td className="max-w-[220px] truncate px-5 py-4 text-muted">
                {formatField(app.custom_fields?.tech_stack)}
              </td>
              <td className="px-5 py-4 text-muted">{formatField(app.custom_fields?.source)}</td>
              <td className="px-5 py-4"><StatusBadge status={app.status} /></td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  {app.link ? (
                    <a href={app.link} target="_blank" className="inline-flex rounded-lg p-2 text-muted hover:bg-white/[0.06] hover:text-cyan-300" title="Open link">
                      <ExternalLink size={15} />
                    </a>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => onEdit(app)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(app)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KanbanBoard({
  applications,
  docCounts,
  onToggleStar,
  onDrop,
  onEdit,
  onDocuments,
}: {
  applications: Application[];
  docCounts: Record<string, number>;
  onToggleStar: (app: Application) => void;
  onDrop: (id: string, status: Application["status"]) => void;
  onEdit: (app: Application) => void;
  onDocuments: (app: Application) => void;
}) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-7">
      {STATUS_ORDER.map((status) => {
        const columnApps = applications.filter((app) => app.status === status);
        const accent = COLUMN_ACCENT[status];
        return (
          <section
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const id = event.dataTransfer.getData("application/id");
              if (id) onDrop(id, status);
            }}
            className="relative min-h-[420px] min-w-[220px] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur"
          >
            <span className={`absolute inset-x-0 top-0 h-[2px] ${accent.bar}`} />
            <div className="mb-3 flex items-center justify-between px-3 pt-4">
              <StatusBadge status={status} />
              <span className={`font-mono text-xs ${accent.count}`}>{String(columnApps.length).padStart(2, "0")}</span>
            </div>
            <div className="space-y-3 px-3 pb-3">
              {columnApps.map((app) => (
                <motion.article
                  key={app.id}
                  layout
                  draggable
                  onDragStart={(event) => (event as unknown as React.DragEvent).dataTransfer.setData("application/id", app.id)}
                  onDoubleClick={() => onEdit(app)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`group cursor-grab rounded-xl border border-white/[0.07] bg-[rgba(10,4,22,0.6)] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200 hover:shadow-[0_16px_38px_rgba(0,0,0,0.45)] hover:brightness-110 ${accent.ring}`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onToggleStar(app)}
                      className={`mt-0.5 rounded-md p-0.5 transition-colors ${
                        isStarred(app) ? "text-cyan-300" : "text-muted hover:text-cyan-300"
                      }`}
                      title={isStarred(app) ? "Unstar job" : "Star job"}
                    >
                      <Star size={14} className={isStarred(app) ? "fill-cyan-300" : ""} />
                    </button>
                    <h3 className="truncate font-display text-sm font-semibold text-foreground">{app.company}</h3>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">{app.position}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span className="font-mono">{app.date_applied}</span>
                    <button onClick={() => onDocuments(app)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-white/[0.05] hover:text-cyan-300">
                      <Paperclip size={13} />
                      {docCounts[app.id] ?? 0}
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        );
      })}
    </motion.div>
  );
}

function countDocuments(documents: ApplicationDocument[]) {
  return documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.application_id] = (acc[doc.application_id] ?? 0) + 1;
    return acc;
  }, {});
}

function formatField(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function isStarred(app: Application) {
  return app.custom_fields?.starred === true;
}
