import { User } from "./user.model.js";
import { Run } from "./run.model.js";
import { Caught } from "./caught.model.js";

// Table links
User.hasMany(Run, { foreignKey: "user_id", onDelete: "CASCADE" });
Run.belongsTo(User, { foreignKey: "user_id" });

Run.hasMany(Caught, { foreignKey: "run_id", onDelete: "CASCADE" });
Caught.belongsTo(Run, { foreignKey: "run_id" });

export { User, Run, Caught };
