import { memo } from "react";
import { formatDex } from "../lib/guide.js";
import Sprite from "./Sprite.jsx";
import styles from "./PokemonCard.module.css";

function PokemonCard({ guide, entry, caught, readOnly, sectionLabel, onToggle }) {
  return (
    <li>
      <button
        type="button"
        className={`${styles.card} ${caught ? styles.caught : ""}`}
        aria-pressed={caught}
        disabled={readOnly}
        onClick={() => onToggle(entry, !caught)}
      >
        <Sprite guide={guide} dex={entry.dex} className={styles.sprite} />
        <span className={styles.body}>
          <span className={styles.title}>
            {entry.dex && <span className={styles.dex}>{formatDex(entry.dex)}</span>} {entry.name}
          </span>
          <span className={styles.method}>{entry.method}</span>
          {sectionLabel && <span className={styles.section}>{sectionLabel}</span>}
        </span>
        <span className={styles.check} aria-hidden="true">{caught ? "✓" : ""}</span>
      </button>
    </li>
  );
}

export default memo(PokemonCard);
