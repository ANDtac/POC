import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config.js";
import { User } from "../models/user.model.js";

const userFromHeader = async (req) => {
  const [scheme, token] = (req.headers["authorization"] || "").split(" ");
  if (scheme !== "Bearer" || !token) return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return await User.findByPk(decoded.id);
  } catch {
    return null;
  }
};

export const verifyToken = async (req, res, next) => {
  const user = await userFromHeader(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
};

// Attaches req.user when a valid token is present, but never rejects.
export const optionalAuth = async (req, res, next) => {
  req.user = await userFromHeader(req);
  next();
};
