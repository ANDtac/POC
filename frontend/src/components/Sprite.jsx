import { fallbackSpriteUrl, spriteUrl } from "../lib/guide.js";

// Tries the game's sprite set, then the modern sprite, then hides itself.
export default function Sprite({ guide, dex, item, className, size = 56 }) {
  const src = spriteUrl(guide, { dex, item });
  if (!src) return <span className={className} style={{ width: size, height: size, flex: "none" }} aria-hidden="true" />;
  return (
    <img
      className={className}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={(e) => {
        const fallback = fallbackSpriteUrl(dex);
        if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
        else e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}
