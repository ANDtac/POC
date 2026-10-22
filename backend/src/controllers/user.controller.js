import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import { emailRegex, usernameRegex, passwordRegex, messages } from "../validation.js";

// GET user by ID (public: no email)
export const getUserById = async (req, res) => {
  const user = await User.findByPk(req.params.id, { attributes: ["id", "username"] });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
};

// GET all users (authenticated, no emails)
export const getAllUsers = async (req, res) => {
  const users = await User.findAll({ attributes: ["id", "username"], order: [["username", "ASC"]] });
  res.json(users);
};

// GET account
export const getProfile = (req, res) => {
  const { id, username, email } = req.user;
  res.json({ id, username, email });
};

// PATCH profile
export const updateProfile = async (req, res) => {
  const { username, email, password, current_password } = req.body ?? {};
  if (username !== undefined && !usernameRegex.test(username)) {
    return res.status(400).json({ error: messages.username });
  }
  if (email !== undefined && !emailRegex.test(email)) {
    return res.status(400).json({ error: messages.email });
  }
  if (password !== undefined) {
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: messages.password });
    }
    // Changing the password requires the old one, so a stolen token can't lock the owner out.
    if (!current_password || !(await bcrypt.compare(current_password, req.user.password))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
  }

  if (username !== undefined) req.user.username = username;
  if (email !== undefined) req.user.email = email.toLowerCase();
  if (password !== undefined) req.user.password = await bcrypt.hash(password, 10);
  try {
    await req.user.save();
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Username or email already in use" });
    }
    throw err;
  }
  res.json({
    message: "Profile updated",
    user: { id: req.user.id, username: req.user.username, email: req.user.email },
  });
};

// DELETE account (runs and catches cascade)
export const deleteProfile = async (req, res) => {
  await req.user.destroy();
  res.json({ message: "Account deleted" });
};
