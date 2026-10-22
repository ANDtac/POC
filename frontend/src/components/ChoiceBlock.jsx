import { choiceLabel, nextChoiceValues } from "../lib/guide.js";
import Sprite from "./Sprite.jsx";
import styles from "./ChoiceBlock.module.css";

export default function ChoiceBlock({ guide, choice, selected = [], readOnly, onChange }) {
  const full = selected.length >= choice.cap;
  return (
    <fieldset className={`${styles.block} ${full ? styles.done : ""}`}>
      <legend className={styles.legend}>
        {choiceLabel(choice)}
        <span className="muted small tabular"> {selected.length}/{choice.cap}</span>
      </legend>
      <ul className={styles.options}>
        {choice.options.map((option) => {
          const isOn = selected.includes(option.value);
          return (
            <li key={option.value}>
              <button
                type="button"
                className={`${styles.option} ${isOn ? styles.on : ""}`}
                aria-pressed={isOn}
                disabled={readOnly || (!isOn && full && choice.cap > 1)}
                onClick={() => onChange(choice.key, nextChoiceValues(choice, selected, option.value))}
              >
                <Sprite guide={guide} dex={option.dex} item={option.item} size={40} className={styles.sprite} />
                <span className={styles.text}>
                  <strong>{option.name}</strong>
                  <span className="muted small">{option.method}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
