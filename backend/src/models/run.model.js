import { DataTypes } from "sequelize";
import { sequelize } from "./sequelize.js";

export const RUN_STATUSES = ["active", "completed", "abandoned"];

// One attempt at a challenge guide, by one user, in one game version.
export const Run = sequelize.define("Run", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  game_id: {
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  version: {
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(60),
    allowNull: false,
  },
  // Index into the guide's sections array: the milestone the player is working toward.
  current_section: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(12),
    allowNull: false,
    defaultValue: "active",
    validate: { isIn: [RUN_STATUSES] },
  },
  // Choice selections, e.g. { starter: ["bulbasaur"], "moon-stone-1": ["nidoqueen", "clefable"] }.
  choices: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});
