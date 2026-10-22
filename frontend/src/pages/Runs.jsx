import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";
import ProgressBar from "../components/ProgressBar.jsx";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function Runs() {
  const queryClient = useQueryClient();
  const { data: runs, isPending, error } = useQuery({ queryKey: ["runs"], queryFn: () => api("/api/runs") });

  const remove = useMutation({
    mutationFn: (id) => api(`/api/runs/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.setQueryData(["runs"], (old) => old?.filter((r) => r.id !== id));
      queryClient.removeQueries({ queryKey: ["run", id] });
    },
  });

  if (isPending) return <p className="muted">Loading runs…</p>;
  if (error) return <p className="error" role="alert">{error.message}</p>;

  return (
    <>
      <div className="page-head">
        <h1>Your runs</h1>
        <Link className="button" to="/runs/new">New run</Link>
      </div>

      {runs.length === 0 ? (
        <div className="empty">
          <p>No runs yet. Pick a game to start your first challenge.</p>
          <Link className="button" to="/runs/new">Start a run</Link>
        </div>
      ) : (
        <ul className="run-list">
          {runs.map((run) => (
            <li key={run.id} className="run-card">
              <Link to={`/runs/${run.id}`} className="run-card__link">
                <span className="run-card__title">{run.title}</span>
                <span className="muted small">
                  {run.game_name} · {run.version} · updated {dateFormat.format(new Date(run.updatedAt))}
                  {run.is_public && " · public"}
                  {run.status !== "active" && ` · ${run.status}`}
                </span>
                <span className="run-card__progress">
                  <ProgressBar value={run.progress.caught} max={run.progress.total} label={`${run.title} progress`} />
                  <span className="small tabular">{run.progress.caught}/{run.progress.total}</span>
                </span>
              </Link>
              <button
                type="button"
                className="link-button danger small"
                onClick={() => window.confirm(`Delete "${run.title}"? This cannot be undone.`) && remove.mutate(run.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {remove.error && <p className="error" role="alert">{remove.error.message}</p>}
    </>
  );
}
