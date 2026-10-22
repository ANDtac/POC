import { Router } from "express";
import { getGames, getGame } from "../controllers/games.controller.js";

const router = Router();

router.get("/", getGames);
router.get("/:id", getGame);

export default router;
