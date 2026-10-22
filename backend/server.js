import { app } from "./src/app.js";
import { sequelize } from "./src/models/sequelize.js";
import { getJwtSecret } from "./src/config.js";

getJwtSecret(); // fail fast when the secret is missing

const PORT = Number(process.env.PORT) || 5050;

await sequelize.sync();
app.listen(PORT, () => {
  console.log(`POC API running on http://localhost:${PORT} (docs: /api-docs)`);
});
