import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export default function NewRun() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: games, isPending, error } = useQuery({ queryKey: ["games"], queryFn: () => api("/api/games") });
  const [gameId, setGameId] = useState(null);
  const [version, setVersion] = useState(null);
  const [title, setTitle] = useState("");

  const create = useMutation({
    mutationFn: (body) => api("/api/runs", { method: "POST", body }),
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      navigate(`/runs/${run.id}`);
    },
  });

  if (isPending) return <p className="muted">Loading games…</p>;
  if (error) return <p className="error" role="alert">{error.message}</p>;

  const game = games.find((g) => g.id === gameId);

  return (
    <div className="narrow">
      <h1>New run</h1>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ game_id: gameId, version, title });
        }}
      >
        <fieldset>
          <legend>Game</legend>
          <div className="choice-grid">
            {games.map((g) => (
              <label key={g.id} className="choice">
                <input
                  type="radio"
                  name="game"
                  value={g.id}
                  checked={gameId === g.id}
                  onChange={() => { setGameId(g.id); setVersion(g.versions.length === 1 ? g.versions[0].id : null); }}
                />
                <span>
                  <strong>{g.name}</strong>
                  <span className="muted small">Gen {g.generation} · {g.entries} Pokémon · {g.sections} milestones</span>
                  {!g.verified && <span className="tag tag--warn">Draft data</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {game && (
          <fieldset>
            <legend>Version</legend>
            <div className="choice-grid choice-grid--row">
              {game.versions.map((v) => (
                <label key={v.id} className="choice">
                  <input type="radio" name="version" value={v.id} checked={version === v.id} onChange={() => setVersion(v.id)} />
                  <span><strong>{v.name}</strong></span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {game && (
          <label>
            Run name <span className="muted">(optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={`${game.name}: ${game.versions.find((v) => v.id === version)?.name ?? "…"}`} />
          </label>
        )}

        {game && !game.verified && (
          <p className="notice">
            This guide is draft data and has not been checked against the published challenge guide yet.
            Locations and milestone placement may be off.
          </p>
        )}

        {create.error && <p className="error" role="alert">{create.error.message}</p>}
        <button className="button" disabled={!gameId || !version || create.isPending}>
          {create.isPending ? "Starting…" : "Start run"}
        </button>
      </form>
    </div>
  );
}
