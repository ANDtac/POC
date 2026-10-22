import express from "express";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import "./models/index.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import gamesRoutes from "./routes/games.routes.js";
import runsRoutes from "./routes/runs.routes.js";

export const app = express();
app.use(express.json());

// Each request shown in the console (skipped under test)
if (process.env.NODE_ENV !== "test") {
  app.use((req, res, next) => {
    res.on("finish", () => console.log(`${req.method} ${req.originalUrl} - ${res.statusCode}`));
    next();
  });
}

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/runs", runsRoutes);

const swaggerDocument = JSON.parse(fs.readFileSync("./swagger.json", "utf8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Malformed JSON gets a 400; anything else is logged and hidden behind a generic 500.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
