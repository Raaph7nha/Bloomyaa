import express from "express";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config();

import authRoutes from "./src/server/routes/authRoutes";
import catalogRoutes from "./src/server/routes/catalogRoutes";
import userPlantRoutes from "./src/server/routes/userPlantRoutes";
import userRoutes from "./src/server/routes/userRoutes";
import identifyRoutes from "./src/server/routes/identifyRoutes";
import reminderRoutes from "./src/server/routes/reminderRoutes";
import aiRoutes from "./src/server/routes/aiRoutes";
import adminRoutes from "./src/server/routes/adminRoutes";
import postRoutes from "./src/server/routes/postRoutes";
import { initDb } from "./src/server/db";
import { requestLogger } from "./src/server/middleware/loggerMiddleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 10000;

  // 🔹 Middlewares
  app.use(requestLogger);
  app.use(express.json());

  // 🔹 DB
  await initDb();

  // 🔹 Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/catalog", catalogRoutes);
  app.use("/api/user/plants", userPlantRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/plant", identifyRoutes);
  app.use("/api/reminders", reminderRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/posts", postRoutes);

  // 🔹 Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // 🔹 Frontend
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ✅ SOLO UN LISTEN AL FINAL
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("🔥 Error starting server:", err);
});