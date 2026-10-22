import { Link } from "react-router";
import { useAuth } from "../auth.jsx";

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="landing">
      <section className="hero">
        <h1>Catch them all before every gym.</h1>
        <p className="lead">
          The Professor Oak Challenge: before you face each gym leader, catch and evolve every Pokémon
          you can get up to that point. This tracker shows what is left in each leg of the game, where
          to find it, and how close you are to the next badge.
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
          <li>Pick a game and version. Version exclusives from the other cartridge are hidden by default.</li>
          <li>Work through one milestone at a time. Tap a Pokémon when you catch or evolve it.</li>
          <li>When the leg is complete, the tracker says you are ready for the gym. Advance and keep going.</li>
          <li>Switch to the location view to see everything left on the route you are standing on.</li>
        </ol>
      </section>

      <p className="muted small">
        Challenge structure follows the{" "}
        <a href="https://www.reddit.com/r/ProfessorOak/comments/bj6yeh/professor_oak_challenge_guides/" target="_blank" rel="noreferrer">
          guides by Mewlax84
        </a>
        . Sprites from PokéAPI. Pokémon is a trademark of Nintendo, Game Freak and Creatures. This is a fan project.
      </p>
    </div>
  );
}
