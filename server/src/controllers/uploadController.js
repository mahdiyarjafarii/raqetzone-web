import path from "path";
import fs from "fs";
import { uploadToS3, getContentType } from "../utils/uploadToS3.js";

/**
 * Upload image controller
 * Handles image uploads from web clients (non-Myket)
 * Uploads to S3 and returns the URL
 */
export const uploadImageController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "فایلی انتخاب نشده است",
      });
    }

    const file = req.file;
    const userId = req.user?.id || "anonymous";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    
    // Create S3 key with user folder structure
    const s3Key = `chat-uploads/${userId}/${timestamp}-${baseName}${ext}`;
    const contentType = getContentType(file.originalname);

    // Upload to S3
    const result = await uploadToS3(file.path, s3Key, contentType);

    // Clean up local file after upload
    fs.unlink(file.path, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    // Return response in the same format as Myket
    res.json({
      success: true,
      fileName: file.originalname,
      name: file.originalname,
      url: result.url,
      filePath: result.s3Key,
    });
  } catch (error) {
    console.error("Upload error:", error);
    
    // Clean up local file on error
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      success: false,
      message: "خطا در آپلود فایل",
      error: error.message,
    });
  }
};
