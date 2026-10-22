import { DataTypes } from "sequelize";
import { sequelize } from "./sequelize.js";

export const Caught = sequelize.define("Caught", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  run_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // Guide entry id: national dex number, optionally with a form suffix ("0052", "0052-alola").
  pokemon_id: {
    type: DataTypes.STRING(24),
    allowNull: false,
    validate: {
      is: /^\d{4}(-[a-z]+)?$/,
    },
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ["run_id", "pokemon_id"],
    },
  ],
});
