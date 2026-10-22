import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, storage } from "../api.js";
import ChoiceBlock from "../components/ChoiceBlock.jsx";
import GuideHtml from "../components/GuideHtml.jsx";
import PokemonCard from "../components/PokemonCard.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import {
  countProgress, eligibleEntries, groupByPlace, matchesFilters, meetsRequirements, pendingChoices,
} from "../lib/guide.js";
import styles from "./Tracker.module.css";

const PREFS_KEY = "oak.trackerPrefs";
const UNDO_MS = 5000;

const loadPrefs = () => {
  try {
    return { view: "milestone", missingOnly: false, ...JSON.parse(storage.get(PREFS_KEY) || "{}") };
  } catch {
    return { view: "milestone", missingOnly: false };
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

  // Optimistic update with rollback, shared by the run mutations below.
  const optimistic = (apply) => ({
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: runKey });
      const previous = queryClient.getQueryData(runKey);
      patchRunCache((old) => apply(old, vars));
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      queryClient.setQueryData(runKey, ctx.previous);
      setToast({ message: `Not saved: ${err.message}` });
    },
  });

  const toggle = useMutation({
    mutationKey: ["toggle", id],
    mutationFn: ({ entry, caught }) => api(`/api/runs/${id}/caught/${entry.id}`, { method: caught ? "PUT" : "DELETE" }),
    ...optimistic((old, { entry, caught }) => ({
      caught: caught ? [...new Set([...old.caught, entry.id])] : old.caught.filter((c) => c !== entry.id),
    })),
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

  const choose = useMutation({
    mutationFn: ({ key, values }) => api(`/api/runs/${id}/choices/${encodeURIComponent(key)}`, { method: "PUT", body: { values } }),
    ...optimistic((old, { key, values }) => {
      const choices = { ...old.choices };
      if (values.length) choices[key] = values;
      else delete choices[key];
      return { choices };
    }),
    onSuccess: (data) => patchRunCache(() => data),
  });

  const bulk = useMutation({
    mutationFn: (body) => api(`/api/runs/${id}/caught`, { method: "PATCH", body }),
    onSuccess: (data) => patchRunCache(() => ({ caught: data.caught })),
    onError: (err) => setToast({ message: `Not saved: ${err.message}` }),
  });

  const updateRun = useMutation({
    mutationFn: (body) => api(`/api/runs/${id}`, { method: "PATCH", body }),
    ...optimistic((_old, body) => body),
    onSuccess: (data) => {
      patchRunCache(() => data);
      queryClient.invalidateQueries({ queryKey: ["runs"] });
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
  const choices = run.choices ?? {};
  const filters = { query, missingOnly: prefs.missingOnly };
  const keep = (entry) => meetsRequirements(entry, choices) && matchesFilters(entry, filters, caught);
  const searching = Boolean(query.trim());
  const overall = countProgress(guide.sections, choices, caught);
  const current = Math.min(run.current_section, guide.sections.length - 1);
  const isLast = current === guide.sections.length - 1;
  const shareUrl = `${window.location.origin}/runs/${run.id}`;

  // Current milestone starts open; a search opens every section with a match.
  const isOpen = (index) => openSections[index] ?? (searching || index === current);

  return (
    <div className={styles.tracker}>
      <div className={styles.summary}>
        <div className={styles.summaryTop}>
          <div>
            <h1 className={styles.title}>{run.title}</h1>
            <p className="muted small">
              {[run.title !== guide.name && guide.name, readOnly && run.owner && `by ${run.owner}`, run.status !== "active" && run.status]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className={styles.overall}>
            <span className={styles.overallCount}>{overall.caught}<span className="muted">/{overall.total}</span></span>
          </div>
        </div>
        <ProgressBar value={overall.caught} max={overall.total} label="Overall progress" />
        <p className={styles.nextUp}>
          {run.status === "completed" ? "Challenge complete." : <>Now: <strong>{guide.sections[current].label}</strong></>}
        </p>
      </div>

      {guide.about && (
        <details className={styles.about}>
          <summary>About this guide</summary>
          <GuideHtml html={guide.about} className={styles.prose} />
        </details>
      )}

      <div className={styles.toolbar} role="search">
        <input
          ref={searchRef}
          type="search"
          className={styles.search}
          placeholder="Search name, number or method ( / )"
          aria-label="Search Pokémon"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.segmented} role="group" aria-label="View">
          <button type="button" aria-pressed={prefs.view === "milestone"} onClick={() => updatePrefs({ view: "milestone" })}>By badge</button>
          <button type="button" aria-pressed={prefs.view === "place"} onClick={() => updatePrefs({ view: "place" })}>By place</button>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={prefs.missingOnly} onChange={(e) => updatePrefs({ missingOnly: e.target.checked })} />
          Missing only
        </label>
      </div>

      {prefs.view === "milestone" ? (
        <ol className={styles.sections}>
          {guide.sections.map((section, index) => {
            const eligible = eligibleEntries(section, choices);
            const progress = { caught: eligible.filter((e) => caught.has(e.id)).length, total: eligible.length };
            const pending = pendingChoices(section, choices);
            const done = pending.length === 0 && progress.caught === progress.total;
            const visible = eligible.filter((e) => matchesFilters(e, filters, caught));
            if (searching && visible.length === 0) return null;
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
                    {section.summaryShort && <span className="muted small">{section.summaryShort}</span>}
                    <span className={styles.sectionProgress}>
                      <ProgressBar value={progress.caught} max={progress.total} label={`${section.label} progress`} size="small" />
                      <span className="small tabular">{progress.caught}/{progress.total}</span>
                    </span>
                  </button>
                </div>

                {state === "current" && done && run.status === "active" && !readOnly && (
                  <div className={styles.ready}>
                    <span>Everything in this section is caught.</span>
                    <button
                      type="button"
                      className="button button--small"
                      disabled={updateRun.isPending}
                      onClick={() => updateRun.mutate(isLast ? { status: "completed" } : { current_section: current + 1 })}
                    >
                      {isLast ? "Finish run" : "Advance to next section"}
                    </button>
                  </div>
                )}

                {open && (
                  <div className={styles.sectionBody}>
                    {section.summaryHtml && (
                      <details className={styles.notes} open={section.summaryOpen}>
                        <summary>Guide notes</summary>
                        <GuideHtml html={section.summaryHtml} className={styles.prose} />
                      </details>
                    )}

                    {section.choices.map((choice) => (
                      <ChoiceBlock
                        key={choice.key}
                        guide={guide}
                        choice={choice}
                        selected={choices[choice.key]}
                        readOnly={readOnly}
                        onChange={(key, values) => choose.mutate({ key, values })}
                      />
                    ))}
                    {pending.length > 0 && !readOnly && (
                      <p className="muted small">Make the choices above to show every Pokémon in this section.</p>
                    )}

                    {visible.length === 0 ? (
                      <p className="muted small">{eligible.length === 0 ? "No Pokémon to show yet." : "Nothing left here."}</p>
                    ) : (
                      <ul className={styles.grid}>
                        {visible.map((entry) => (
                          <PokemonCard key={entry.id} guide={guide} entry={entry} caught={caught.has(entry.id)} readOnly={readOnly} onToggle={onToggle} />
                        ))}
                      </ul>
                    )}

                    {!readOnly && (
                      <div className={styles.sectionActions}>
                        {progress.caught < progress.total && (
                          <button
                            type="button"
                            className="link-button small"
                            disabled={bulk.isPending}
                            onClick={() => {
                              const ids = eligible.filter((e) => !caught.has(e.id)).map((e) => e.id);
                              if (window.confirm(`Mark ${ids.length} Pokémon in "${section.label}" as caught?`)) bulk.mutate({ add: ids });
                            }}
                          >
                            Mark all caught
                          </button>
                        )}
                        {state !== "current" && run.status === "active" && (
                          <button type="button" className="link-button small" onClick={() => updateRun.mutate({ current_section: index })}>
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
          {groupByPlace(guide.sections, keep).map((group) => (
            <section key={group.place} className={styles.section}>
              <h2 className={styles.placeHead}>
                {group.place}
                <span className="muted small tabular">
                  {group.entries.filter((x) => caught.has(x.entry.id)).length}/{group.entries.length}
                </span>
              </h2>
              <ul className={styles.grid}>
                {group.entries.map(({ entry, sectionIndex }) => (
                  <PokemonCard
                    key={`${entry.id}-${sectionIndex}`}
                    guide={guide}
                    entry={entry}
                    caught={caught.has(entry.id)}
                    readOnly={readOnly}
                    sectionLabel={guide.sections[sectionIndex].label}
                    onToggle={onToggle}
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
            <input type="checkbox" checked={run.is_public} onChange={(e) => updateRun.mutate({ is_public: e.target.checked })} />
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

      <p className="muted small">
        Guide:{" "}
        {guide.source?.guide?.url
          ? <a href={guide.source.guide.url} target="_blank" rel="noreferrer">{guide.source.guide.name}</a>
          : guide.source?.guide?.name}
        {guide.source?.data && (
          <>
            {" · "}Data: <a href={guide.source.data.url} target="_blank" rel="noreferrer">{guide.source.data.name}</a> ({guide.source.data.license})
          </>
        )}
      </p>

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
