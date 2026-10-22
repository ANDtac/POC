import { memo } from "react";
import { METHOD_LABELS, NEEDS_TRADE, formatDex, spriteUrl } from "../lib/guide.js";
import styles from "./PokemonCard.module.css";

function PokemonCard({ entry, caught, readOnly, otherVersion, versionBadge, sectionLabel, showLocation = true, onToggle }) {
  const classes = [styles.card, caught && styles.caught, otherVersion && styles.otherVersion].filter(Boolean).join(" ");
  return (
    <li>
      <button
        type="button"
        className={classes}
        aria-pressed={caught}
        disabled={readOnly}
        onClick={() => onToggle(entry, !caught)}
      >
        <img
          className={styles.sprite}
          src={spriteUrl(entry.id)}
          alt=""
          width="56"
          height="56"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        />
        <span className={styles.body}>
          <span className={styles.title}>
            <span className={styles.dex}>{formatDex(entry.id)}</span> {entry.name}
          </span>
          {showLocation && <span className={styles.location}>{entry.location}</span>}
          {sectionLabel && <span className={styles.location}>{sectionLabel}</span>}
          <span className={styles.badges}>
            <span className={`${styles.badge} ${NEEDS_TRADE.has(entry.method) ? styles.badgeTrade : ""}`}>
              {METHOD_LABELS[entry.method] ?? entry.method}
            </span>
            {versionBadge && <span className={`${styles.badge} ${styles.badgeVersion}`}>{versionBadge} only</span>}
          </span>
          {entry.notes && <span className={styles.notes}>{entry.notes}</span>}
        </span>
        <span className={styles.check} aria-hidden="true">{caught ? "✓" : ""}</span>
      </button>
    </li>
  );
}

export default memo(PokemonCard);
