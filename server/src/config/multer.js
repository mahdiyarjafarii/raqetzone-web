import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const sanitizeFileName = (name) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images and common document formats
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("فرمت فایل پشتیبانی نمی‌شود"), false);
  }
};

/**
 * Create a multer upload instance for a specific folder
 * @param {string} folderName - Name of the folder to store files (e.g., 'user', 'attachment')
 * @returns {multer.Multer} Configured multer instance
 */
export const createUpload = (folderName) => {
  // Configure storage with folder name and date structure
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const currentDate = new Date().toISOString().split("T")[0];
      const folderPath = path.join(uploadsDir, folderName, currentDate);

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      cb(null, folderPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      const name = sanitizeFileName(path.basename(file.originalname, ext));
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });
};

// Default upload instance (for backward compatibility - stores in date-based folders)
const defaultStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const currentDate = new Date().toISOString().split("T")[0];
    const dateDir = path.join(uploadsDir, currentDate);

    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }

    cb(null, dateDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const name = sanitizeFileName(path.basename(file.originalname, ext));
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage: defaultStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
