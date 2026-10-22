import { Router } from "express";
import { verifyToken, optionalAuth } from "../middlewares/auth.middleware.js";
import {
  loadRun, listRuns, createRun, getRun, updateRun, deleteRun,
  markCaught, unmarkCaught, bulkCaught,
} from "../controllers/runs.controller.js";

const router = Router();
const ownRun = [verifyToken, loadRun()];

router.get("/", verifyToken, listRuns);
router.post("/", verifyToken, createRun);
router.get("/:id", optionalAuth, loadRun({ allowPublic: true }), getRun);
router.patch("/:id", ...ownRun, updateRun);
router.delete("/:id", ...ownRun, deleteRun);
router.patch("/:id/caught", ...ownRun, bulkCaught);
router.put("/:id/caught/:pokemon_id", ...ownRun, markCaught);
router.delete("/:id/caught/:pokemon_id", ...ownRun, unmarkCaught);

export default router;
