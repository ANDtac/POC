import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

const groupByGeneration = (games) => {
  const groups = new Map();
  for (const game of games) {
    const key = `Gen ${game.generation ?? "?"}${game.region ? ` · ${game.region}` : ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(game);
  }
  return [...groups.entries()];
};

export default function NewRun() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: games, isPending, error } = useQuery({ queryKey: ["games"], queryFn: () => api("/api/games") });
  const [gameId, setGameId] = useState(null);
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

  if (games.length === 0) {
    return (
      <div className="narrow">
        <h1>New run</h1>
        <div className="empty">
          <p>No challenge guides are installed yet.</p>
          <p className="muted small">Run <code>npm run import-guides</code> in <code>backend/</code> to add them.</p>
        </div>
      </div>
    );
  }

  const game = games.find((g) => g.id === gameId);

  return (
    <div className="narrow narrow--wide">
      <h1>New run</h1>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ game_id: gameId, title });
        }}
      >
        {groupByGeneration(games).map(([label, list]) => (
          <fieldset key={label}>
            <legend>{label}</legend>
            <div className="choice-grid choice-grid--row">
              {list.map((g) => (
                <label key={g.id} className="choice">
                  <input type="radio" name="game" value={g.id} checked={gameId === g.id} onChange={() => setGameId(g.id)} />
                  <span>
                    <strong>{g.name.replace(/^Pokémon\s+/, "")}</strong>
                    <span className="muted small">{g.entries} Pokémon · {g.sections} sections</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {game && (
          <label>
            Run name <span className="muted">(optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={game.name} />
          </label>
        )}

        {create.error && <p className="error" role="alert">{create.error.message}</p>}
        <button className="button" disabled={!gameId || create.isPending}>
          {create.isPending ? "Starting…" : "Start run"}
        </button>
      </form>
    </div>
  );
}
