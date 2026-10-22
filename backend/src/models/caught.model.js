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
  // Guide entry id: the Pokémon's name as a slug ("bulbasaur", "nidoran-f", "mr-mime").
  pokemon_id: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: {
      is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
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
