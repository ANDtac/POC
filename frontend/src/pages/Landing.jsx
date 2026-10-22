import { Link } from "react-router";
import { useAuth } from "../auth.jsx";

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="landing">
      <section className="hero">
        <h1>Catch them all before every badge.</h1>
        <p className="lead">
          The Professor Oak Challenge: before each gym badge, catch and evolve every Pokémon you can get up to
          that point. Track it badge by badge for 16 games, from Red and Blue to HeartGold and SoulSilver, with
          the full guide notes for every section.
        </p>
        <div className="actions">
          {user ? (
            <Link className="button" to="/runs">Go to your runs</Link>
          ) : (
            <>
              <Link className="button" to="/register">Start a run</Link>
              <Link className="button button--ghost" to="/login">Log in</Link>
            </>
          )}
        </div>
      </section>

      <section className="rules">
        <h2>How it works</h2>
        <ol>
          <li>Pick a game. Each run follows that game's guide, split into one section per badge.</li>
          <li>Make the guide's choices (starter, fossil, Moon Stones, Eeveelution) and the list adjusts to match.</li>
          <li>Tap a Pokémon when you catch or evolve it. When a section is complete, advance to the next badge.</li>
          <li>Your runs are saved to your account, so they follow you across devices. Share a read-only link if you like.</li>
        </ol>
      </section>

      <p className="muted small">
        Challenge guides by{" "}
        <a href="https://www.reddit.com/r/ProfessorOak/comments/bj6yeh/professor_oak_challenge_guides/" target="_blank" rel="noreferrer">u/mewlax84</a>.
        Guide data from the{" "}
        <a href="https://github.com/EzraSkwarka/OakChallenge" target="_blank" rel="noreferrer">Oak Challenge Tracker</a>{" "}
        by EzraSkwarka (MIT). Sprites from PokéAPI. Pokémon is a trademark of Nintendo, Game Freak and Creatures. This is a fan project.
      </p>
    </div>
  );
}
