import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import multer from "multer";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL =
  process.env.DATABASE_URL || "mongodb://localhost:27017/n2m-crm";

// middleware cơ bản
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

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

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "20");
const ALLOWED_MIME = (process.env.ALLOWED_MIME || "").split(",");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} not allowed`));
  },
});
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

const { Schema } = mongoose;
const FolderSchema = new Schema({
  name: { type: String, required: true },
  parentId: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
  children: [{ type: Schema.Types.ObjectId, ref: "Folder" }],
  files: [{ type: Schema.Types.ObjectId, ref: "File" }],
});
const FileSchema = new Schema({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String },
  url: { type: String },
  folderId: { type: Schema.Types.ObjectId, ref: "Folder" },
  createdAt: { type: Date, default: Date.now },
});
const Folder = mongoose.model("Folder", FolderSchema);
const File = mongoose.model("File", FileSchema);

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

const ensureRoot = async () => {
  const root = await Folder.findOne({ parentId: null });
  if (!root) {
    const f = new Folder({
      name: "Root",
      parentId: null,
      children: [],
      files: [],
    });
    await f.save();
    console.log("Root folder created");
  }
};
ensureRoot();

app.get("/api/folders", async (req, res) => {
  const folders = await Folder.find().lean();
  res.json(folders);
});

app.post("/api/folders", async (req, res) => {
  const { name, parentId } = req.body;
  console.log(req.body);
  const folder = new Folder({
    name,
    parentId: parentId || null,
    children: [],
    files: [],
  });
  await folder.save();
  if (parentId)
    await Folder.findByIdAndUpdate(parentId, {
      $push: { children: folder._id },
    });
  res.json(folder);
});

const collectFolderTreeIds = async (startId: string) => {
  const ids = [];
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop();
    ids.push(id);
    const node = await Folder.findById(id).select("children").lean();
    if (node && node.children)
      stack.push(...node.children.map((c) => c.toString()));
  }
  return ids;
};

app.delete("/api/folders/:id", async (req, res) => {
  const { id } = req.params;
  const ids = await collectFolderTreeIds(id);
  const files = await File.find({ folderId: { $in: ids } });
  for (const f of files) {
    if (f.url) {
      const p = path.join(UPLOAD_DIR, path.basename(f.url));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
  await File.deleteMany({ folderId: { $in: ids } });
  const folder = await Folder.findById(id);
  if (folder && folder.parentId)
    await Folder.findByIdAndUpdate(folder.parentId, {
      $pull: { children: folder._id },
    });
  await Folder.deleteMany({ _id: { $in: ids } });
  res.json({ ok: true, deletedCount: ids.length });
});

app.get("/api/files/:folderId", async (req, res) => {
  const { folderId } = req.params;
  const files = await File.find({ folderId }).lean();
  const host = `http://localhost:${PORT}`;
  const filesWithUrl = files.map((f) => ({
    ...f,
    url: f.url ? `${host}/uploads/${path.basename(f.url)}` : null,
  }));
  res.json(filesWithUrl);
});

app.put("/api/folders/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Tên folder không hợp lệ" });
  }

  const folder = await Folder.findByIdAndUpdate(id, { name }, { new: true });

  if (!folder) return res.status(404).json({ error: "Không tìm thấy folder" });

  res.json(folder);
});

app.post(
  "/api/upload/:folderId",
  upload.array("files", 5),
  async (req, res) => {
    const { folderId } = req.params;
    const created = [];
    for (const file of req?.files as Express.Multer.File[]) {
      const fileDoc = new File({
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        url: file.filename,
        folderId,
      });
      await fileDoc.save();
      created.push(fileDoc);
      await Folder.findByIdAndUpdate(folderId, {
        $push: { files: fileDoc._id },
      });
    }
    res.json({ uploaded: created.length, files: created });
  }
);

app.delete("/api/files/:id", async (req, res) => {
  const { id } = req.params;
  const file = await File.findById(id);
  if (!file) return res.status(404).json({ error: "Not found" });
  if (file.url) {
    const p = path.join(UPLOAD_DIR, path.basename(file.url));
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  await File.deleteOne({ _id: id });
  if (file.folderId)
    await Folder.findByIdAndUpdate(file.folderId, {
      $pull: { files: file._id },
    });
  res.json({ ok: true });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
