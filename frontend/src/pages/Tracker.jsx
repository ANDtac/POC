import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, storage } from "../api.js";
import ProgressBar from "../components/ProgressBar.jsx";
import PokemonCard from "../components/PokemonCard.jsx";
import {
  EVOLUTIONS_GROUP, METHOD_LABELS, allEntries, countProgress, groupByLocation, isInVersion, matchesFilters,
  versionLabel,
} from "../lib/guide.js";
import styles from "./Tracker.module.css";

const PREFS_KEY = "oak.trackerPrefs";
const UNDO_MS = 5000;

const loadPrefs = () => {
  try {
    return { view: "milestone", missingOnly: false, showOtherVersions: false, ...JSON.parse(storage.get(PREFS_KEY) || "{}") };
  } catch {
    return { view: "milestone", missingOnly: false, showOtherVersions: false };
  }
};

export default function Tracker() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const runKey = useMemo(() => ["run", id], [id]);

  const runQuery = useQuery({ queryKey: runKey, queryFn: () => api(`/api/runs/${id}`) });
  const run = runQuery.data;
  const guideQuery = useQuery({
    queryKey: ["game", run?.game_id],
    queryFn: () => api(`/api/games/${run.game_id}`),
    enabled: Boolean(run),
    staleTime: Infinity,
  });
  const guide = guideQuery.data;

  const [prefs, setPrefs] = useState(loadPrefs);
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [openSections, setOpenSections] = useState({});
  const [toast, setToast] = useState(null);
  const searchRef = useRef(null);

  const updatePrefs = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      storage.set(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // "/" focuses search, like most list UIs.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.target.closest?.("input, textarea, select")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const patchRunCache = useCallback(
    (patch) => queryClient.setQueryData(runKey, (old) => (old ? { ...old, ...patch(old) } : old)),
    [queryClient, runKey],
  );

  const toggle = useMutation({
    mutationKey: ["toggle", id],
    mutationFn: ({ entry, caught }) =>
      api(`/api/runs/${id}/caught/${entry.id}`, { method: caught ? "PUT" : "DELETE" }),
    onMutate: async ({ entry, caught }) => {
      await queryClient.cancelQueries({ queryKey: runKey });
      const previous = queryClient.getQueryData(runKey);
      patchRunCache((old) => ({
        caught: caught ? [...new Set([...old.caught, entry.id])] : old.caught.filter((c) => c !== entry.id),
      }));
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      queryClient.setQueryData(runKey, ctx.previous);
      setToast({ message: `Not saved: ${err.message}` });
    },
    onSettled: () => {
      // Refetch only after the last in-flight toggle, so fast taps don't flicker.
      if (queryClient.isMutating({ mutationKey: ["toggle", id] }) === 1) {
        queryClient.invalidateQueries({ queryKey: runKey });
      }
    },
  });

  const onToggle = useCallback(
    (entry, caught) => {
      toggle.mutate({ entry, caught });
      setToast({
        message: `${entry.name} ${caught ? "marked caught" : "unmarked"}`,
        undo: () => toggle.mutate({ entry, caught: !caught }),
      });
    },
    [toggle.mutate], // stable across renders, keeps memoized cards from re-rendering
  );

  const bulk = useMutation({
    mutationFn: (body) => api(`/api/runs/${id}/caught`, { method: "PATCH", body }),
    onSuccess: (data) => patchRunCache(() => ({ caught: data.caught })),
    onError: (err) => setToast({ message: `Not saved: ${err.message}` }),
  });

  const updateRun = useMutation({
    mutationFn: (body) => api(`/api/runs/${id}`, { method: "PATCH", body }),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: runKey });
      const previous = queryClient.getQueryData(runKey);
      patchRunCache(() => body);
      return { previous };
    },
    onSuccess: (data) => {
      patchRunCache(() => data);
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
    onError: (err, _body, ctx) => {
      queryClient.setQueryData(runKey, ctx.previous);
      setToast({ message: `Not saved: ${err.message}` });
    },
  });

  const caught = useMemo(() => new Set(run?.caught ?? []), [run?.caught]);

  if (runQuery.isPending || (run && guideQuery.isPending)) return <p className="muted">Loading run…</p>;
  if (runQuery.error) {
    return (
      <div className="narrow">
        <h1>Run not found</h1>
        <p>It may be private or deleted. <Link to="/runs">Back to your runs</Link></p>
      </div>
    );
  }
  if (guideQuery.error) return <p className="error" role="alert">{guideQuery.error.message}</p>;

  const readOnly = !run.is_owner;
  const filters = { query, method, missingOnly: prefs.missingOnly, showOtherVersions: prefs.showOtherVersions };
  const keep = (entry) => matchesFilters(entry, filters, run.version, caught);
  const filtering = Boolean(query.trim()) || method !== "all";
  const overall = countProgress(allEntries(guide), run.version, caught);
  const current = Math.min(run.current_section, guide.sections.length - 1);
  const currentSection = guide.sections[current];
  const isLast = current === guide.sections.length - 1;
  const methodsInGuide = [...new Set(allEntries(guide).map((e) => e.method))];
  const otherVersionCaught = allEntries(guide).filter((e) => !isInVersion(e, run.version) && caught.has(e.id)).length;

  const cardProps = (entry) => {
    const otherVersion = !isInVersion(entry, run.version);
    return {
      entry,
      caught: caught.has(entry.id),
      readOnly,
      otherVersion,
      versionBadge: entry.versions ? versionLabel(guide, entry.versions) : null,
      onToggle,
    };
  };

  // Current milestone starts open; a search or method filter opens every matching section.
  const isOpen = (index) => openSections[index] ?? (filtering || index === current);

  const shareUrl = `${window.location.origin}/runs/${run.id}`;

  return (
    <div className={styles.tracker}>
      <div className={styles.summary}>
        <div className={styles.summaryTop}>
          <div>
            <h1 className={styles.title}>{run.title}</h1>
            <p className="muted small">
              {guide.name} · {versionLabel(guide, [run.version])}
              {readOnly && run.owner && <> · by {run.owner}</>}
              {run.status !== "active" && <> · {run.status}</>}
            </p>
          </div>
          <div className={styles.overall}>
            <span className={styles.overallCount}>{overall.caught}<span className="muted">/{overall.total}</span></span>
            {otherVersionCaught > 0 && <span className="muted small">+{otherVersionCaught} traded</span>}
          </div>
        </div>
        <ProgressBar value={overall.caught} max={overall.total} label="Overall progress" />
        <p className={styles.nextUp}>
          {run.status === "completed" ? "Challenge complete." : (
            <>Working toward: <strong>{currentSection.leader ?? currentSection.label}</strong></>
          )}
        </p>
      </div>

      {!guide.verified && (
        <p className="notice">
          Draft guide data. Check locations and milestones against{" "}
          <a href={guide.source?.url} target="_blank" rel="noreferrer">{guide.source?.name ?? "the published guide"}</a>.
        </p>
      )}

      <div className={styles.toolbar} role="search">
        <input
          ref={searchRef}
          type="search"
          className={styles.search}
          placeholder="Search name, number or location ( / )"
          aria-label="Search Pokémon"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select aria-label="Filter by method" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="all">All methods</option>
          {methodsInGuide.map((m) => <option key={m} value={m}>{METHOD_LABELS[m] ?? m}</option>)}
        </select>
        <div className={styles.segmented} role="group" aria-label="View">
          <button type="button" aria-pressed={prefs.view === "milestone"} onClick={() => updatePrefs({ view: "milestone" })}>By gym</button>
          <button type="button" aria-pressed={prefs.view === "location"} onClick={() => updatePrefs({ view: "location" })}>By location</button>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={prefs.missingOnly} onChange={(e) => updatePrefs({ missingOnly: e.target.checked })} />
          Missing only
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={prefs.showOtherVersions} onChange={(e) => updatePrefs({ showOtherVersions: e.target.checked })} />
          Other versions
        </label>
      </div>

      {prefs.view === "milestone" ? (
        <ol className={styles.sections}>
          {guide.sections.map((section, index) => {
            const progress = countProgress(section.entries, run.version, caught);
            const done = progress.caught === progress.total;
            const visible = section.entries.filter(keep);
            if (filtering && visible.length === 0) return null;
            const open = isOpen(index);
            const state = index < current ? "cleared" : index === current ? "current" : "upcoming";
            return (
              <li key={section.id} className={`${styles.section} ${styles[state]}`}>
                <div className={styles.sectionHead}>
                  <button
                    type="button"
                    className={styles.sectionToggle}
                    aria-expanded={open}
                    onClick={() => setOpenSections((prev) => ({ ...prev, [index]: !open }))}
                  >
                    <span className={styles.sectionLabel}>
                      {section.label}
                      {state === "current" && <span className="tag">Current</span>}
                      {state === "cleared" && <span className="tag tag--ok">Cleared</span>}
                    </span>
                    {section.area && <span className="muted small">{section.area}</span>}
                    <span className={styles.sectionProgress}>
                      <ProgressBar value={progress.caught} max={progress.total} label={`${section.label} progress`} size="small" />
                      <span className="small tabular">{progress.caught}/{progress.total}</span>
                    </span>
                  </button>
                </div>

                {state === "current" && done && run.status === "active" && !readOnly && (
                  <div className={styles.ready}>
                    <span>
                      {section.leader
                        ? <>Everything for this leg is caught. Ready for <strong>{section.leader}</strong>.</>
                        : <>Everything in this section is caught.</>}
                    </span>
                    <button
                      type="button"
                      className="button button--small"
                      disabled={updateRun.isPending}
                      onClick={() => updateRun.mutate(isLast ? { status: "completed" } : { current_section: current + 1 })}
                    >
                      {isLast ? "Finish run" : section.leader ? `Beat ${section.leader}, advance` : "Advance"}
                    </button>
                  </div>
                )}

                {open && (
                  <div className={styles.sectionBody}>
                    {section.entries.length === 0 ? (
                      <p className="muted small">No new Pokémon in this leg.</p>
                    ) : visible.length === 0 ? (
                      <p className="muted small">Nothing left here.</p>
                    ) : (
                      <ul className={styles.grid}>
                        {visible.map((entry) => <PokemonCard key={entry.id} {...cardProps(entry)} showLocation />)}
                      </ul>
                    )}
                    {!readOnly && (
                      <div className={styles.sectionActions}>
                        {!done && (
                          <button
                            type="button"
                            className="link-button small"
                            disabled={bulk.isPending}
                            onClick={() => {
                              const ids = section.entries.filter((e) => isInVersion(e, run.version) && !caught.has(e.id)).map((e) => e.id);
                              if (window.confirm(`Mark ${ids.length} Pokémon in "${section.label}" as caught?`)) bulk.mutate({ add: ids });
                            }}
                          >
                            Mark all caught
                          </button>
                        )}
                        {state !== "current" && run.status === "active" && (
                          <button
                            type="button"
                            className="link-button small"
                            onClick={() => updateRun.mutate({ current_section: index })}
                          >
                            Set as current
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className={styles.sections}>
          {groupByLocation(guide, keep).map((group) => (
            <section key={group.location} className={styles.section}>
              <h2 className={styles.locationHead}>
                {group.location}
                <span className="muted small tabular">
                  {group.entries.filter((x) => caught.has(x.entry.id)).length}/{group.entries.length}
                </span>
              </h2>
              <ul className={styles.grid}>
                {group.entries.map(({ entry, sectionIndex }) => (
                  <PokemonCard
                    key={entry.id}
                    {...cardProps(entry)}
                    showLocation={group.location === EVOLUTIONS_GROUP}
                    sectionLabel={guide.sections[sectionIndex].label}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {!readOnly && (
        <section className={styles.share}>
          <h2>Sharing</h2>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={run.is_public}
              onChange={(e) => updateRun.mutate({ is_public: e.target.checked })}
            />
            Anyone with the link can view this run (read-only)
          </label>
          {run.is_public && (
            <div className={styles.shareRow}>
              <input readOnly value={shareUrl} aria-label="Share link" onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className="button button--small"
                onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => setToast({ message: "Link copied" }))}
              >
                Copy
              </button>
            </div>
          )}
        </section>
      )}

      <div className={styles.toastRegion} role="status" aria-live="polite">
        {toast && (
          <div className={styles.toast}>
            <span>{toast.message}</span>
            {toast.undo && (
              <button type="button" className="link-button" onClick={() => { toast.undo(); setToast(null); }}>
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
