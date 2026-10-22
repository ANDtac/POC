import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { getProfile, updateProfile, deleteProfile, getAllUsers, getUserById } from "../controllers/user.controller.js";

const router = Router();

router.get("/", verifyToken, getProfile);
router.get("/all", verifyToken, getAllUsers);
router.get("/:id", getUserById);
router.patch("/", verifyToken, updateProfile);
router.delete("/", verifyToken, deleteProfile);

export default router;
