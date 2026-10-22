import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getJwtSecret, TOKEN_TTL } from "../config.js";
import { User } from "../models/user.model.js";
import { emailRegex, usernameRegex, passwordRegex, messages } from "../validation.js";

const publicUser = (user) => ({ id: user.id, username: user.username, email: user.email });

const signToken = (user) => jwt.sign({ id: user.id }, getJwtSecret(), { expiresIn: TOKEN_TTL });

export const register = async (req, res) => {
  const { username, email, password } = req.body ?? {};
  if (!usernameRegex.test(username ?? "")) {
    return res.status(400).json({ error: messages.username });
  }
  if (!emailRegex.test(email ?? "")) {
    return res.status(400).json({ error: messages.email });
  }
  if (!passwordRegex.test(password ?? "")) {
    return res.status(400).json({ error: messages.password });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email: email.toLowerCase(), password: hashed });
    res.status(201).json({ message: "User registered", token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Username or email already in use" });
    }
    throw err;
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = email && await User.findOne({ where: { email: email.toLowerCase() } });
  // Same response for unknown email and wrong password, so accounts can't be enumerated.
  if (!user || !password || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({ message: "Logged in", token: signToken(user), user: publicUser(user) });
};

export const verifyTokenEndpoint = (req, res) => {
  res.json({ message: "Token is valid", user: publicUser(req.user) });
};
