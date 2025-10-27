import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/n2m-crm";

// middleware cơ bản
app.use(express.json());

// --- Kết nối Mongo ---
async function connectMongo() {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("[mongo] connected:", DATABASE_URL);
  } catch (err) {
    console.error("[mongo] connect error:", err);
    process.exit(1);
  }
}
connectMongo();

// --- Routes tối giản ---
app.get("/health", (_req, res) => {
  const stateMap: any = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  res.json({
    ok: true,
    mongoState: stateMap[mongoose.connection.readyState] ?? "unknown",
  });
});

app.get("/db-ping", async (_req, res) => {
  try {
    // ping trực tiếp đến MongoDB (yêu cầu Mongo 4.2+)
    if (!mongoose.connection.db) {
      throw new Error("MongoDB connection not ready");
    }
    const r = await mongoose.connection.db.admin().ping();
    res.json({ ok: true, ping: r });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "ping failed" });
  }
});

// --- Graceful shutdown ---
async function shutdown(signal: string) {
  console.log(`[server] ${signal} received. Closing...`);
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// --- Start server ---
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
