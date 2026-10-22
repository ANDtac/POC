import { getGuide, listGuides } from "../guides/catalog.js";

// GET all games with a challenge guide
export const getGames = (req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  res.json(listGuides());
};

// GET full guide for one game
export const getGame = (req, res) => {
  const guide = getGuide(req.params.id);
  if (!guide) return res.status(404).json({ error: "Game not found" });
  res.set("Cache-Control", "public, max-age=300");
  res.json(guide);
};
