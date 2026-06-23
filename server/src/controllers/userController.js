import { eq, and, or, ne } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { validateIranianPhone } from "../utils/validation.js";
import { getPlanCredits } from "../utils/credits/getPlanCredits.js";

const NON_WEB_IMAGE_EXTS = new Set([".heic", ".heif", ".tif", ".tiff", ".bmp", ".avif"]);

async function convertToJpegIfNeeded(filePath, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  if (!NON_WEB_IMAGE_EXTS.has(ext)) return filePath;

  const jpegPath = filePath.replace(/\.[^.]+$/, ".jpg");
  await sharp(filePath).jpeg({ quality: 85 }).toFile(jpegPath);
  fs.unlinkSync(filePath);
  return jpegPath;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get current user info (protected route)
 */
export const getCurrentUserController = async (req, res) => {
  try {
    const user = req.user;

    if(user.subscriptionType) {
      user.totalCredits = getPlanCredits(user.subscriptionType);
    }

    return res.status(200).json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        city: user.city,
        email: user.email,
        image: user.image,
        isCoach: user.isCoach ?? false,
        coachVerificationStatus: user.coachVerificationStatus ?? "none",
        coachHeadline: user.coachHeadline,
        coachExperienceYears: user.coachExperienceYears,
        coachHourlyPrice: user.coachHourlyPrice,
        coachSpecialties: user.coachSpecialties,
        coachCertifications: user.coachCertifications,
        coachLanguages: user.coachLanguages,
        credits: user.credits,
        totalCredits: user.totalCredits,
        subscriptionType: user.subscriptionType,
        subscriptionEndDate: user.subscriptionEndDate,
        hasSeenTour: user.hasSeenTour ?? false,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Update user profile
 */
export const updateProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      firstName,
      lastName,
      city,
      phone,
      email,
      skillLevel,
      favoriteSport,
      isCoach,
      coachHeadline,
      coachExperienceYears,
      coachHourlyPrice,
      coachSpecialties,
      coachCertifications,
      coachLanguages,
      hasSeenTour,
    } = req.body;

    // Validate phone if provided
    if (phone && !validateIranianPhone(phone)) {
      return res.status(400).json({ message: "فرمت شماره تلفن نامعتبر است" });
    }

    // Check if phone is taken by another user
    if (phone) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.phone, phone), ne(users.id, userId)))
        .limit(1);

      if (existingUser) {
        return res
          .status(400)
          .json({ message: "این شماره تلفن قبلاً استفاده شده است" });
      }
    }

    // Check if email is taken by another user
    if (email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, userId)))
        .limit(1);

      if (existingUser) {
        return res
          .status(400)
          .json({ message: "این ایمیل قبلاً استفاده شده است" });
      }
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        name: name || req.user.name,
        firstName: firstName || req.user.firstName,
        lastName: lastName || req.user.lastName,
        city: city || req.user.city,
        phone: phone || req.user.phone,
        email: email || req.user.email,
        ...(typeof isCoach === "boolean" && {
          isCoach,
          coachVerificationStatus: isCoach
            ? (req.user.coachVerificationStatus === "approved" ? "approved" : "pending")
            : "none",
        }),
        ...(skillLevel && { skillLevel }),
        ...(favoriteSport && { favoriteSport }),
        ...(typeof hasSeenTour === "boolean" && { hasSeenTour }),
        ...(typeof coachHeadline === "string" && { coachHeadline: coachHeadline.trim() || null }),
        ...(coachExperienceYears != null && {
          coachExperienceYears: Number.isFinite(Number(coachExperienceYears))
            ? Number.parseInt(coachExperienceYears, 10)
            : null,
        }),
        ...(coachHourlyPrice != null && {
          coachHourlyPrice: Number.isFinite(Number(coachHourlyPrice))
            ? Number.parseInt(coachHourlyPrice, 10)
            : null,
        }),
        ...(typeof coachSpecialties === "string" && { coachSpecialties: coachSpecialties.trim() || null }),
        ...(typeof coachCertifications === "string" && { coachCertifications: coachCertifications.trim() || null }),
        ...(typeof coachLanguages === "string" && { coachLanguages: coachLanguages.trim() || null }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return res.status(200).json({
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        city: updatedUser.city,
        email: updatedUser.email,
        image: updatedUser.image,
        isCoach: updatedUser.isCoach ?? false,
        coachVerificationStatus: updatedUser.coachVerificationStatus ?? "none",
        coachHeadline: updatedUser.coachHeadline,
        coachExperienceYears: updatedUser.coachExperienceYears,
        coachHourlyPrice: updatedUser.coachHourlyPrice,
        coachSpecialties: updatedUser.coachSpecialties,
        coachCertifications: updatedUser.coachCertifications,
        coachLanguages: updatedUser.coachLanguages,
        skillLevel: updatedUser.skillLevel,
        favoriteSport: updatedUser.favoriteSport,
        hasSeenTour: updatedUser.hasSeenTour ?? false,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Upload profile image
 */
export const uploadProfileImageController = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "لطفاً تصویر را انتخاب کنید" });
    }

    // Get current user to check for existing image
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    console.log("Profile image current user state:", {
      userId,
      currentImage: currentUser?.image,
      newFile: {
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      },
    });

    // Delete previous image if it exists
    if (currentUser?.image) {
      try {
        // Handle both relative paths and full URLs
        let relativePath = currentUser.image;

        // If it's a full URL, extract the relative path
        if (
          relativePath.startsWith("http://") ||
          relativePath.startsWith("https://")
        ) {
          const urlParts = relativePath.split("/uploads/");
          if (urlParts.length > 1) {
            relativePath = urlParts[1];
            if (relativePath.startsWith("user/")) {
              relativePath = relativePath.slice("user/".length);
            }
          } else {
            // External URL (like Google), skip deletion
            relativePath = null;
          }
        }

        // Delete file if it's a local file
        if (relativePath) {
          const filePath = path.join(
            __dirname,
            "../../public/uploads/user",
            relativePath
          );

          // Check if file exists and delete it
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Deleted old profile image:", { filePath });
          } else {
            console.log("Old profile image file not found, skipping delete:", { filePath });
          }
        }
      } catch (deleteError) {
        // Log error but don't fail the upload
        console.error("Error deleting old image:", deleteError);
      }
    }

    // Convert non-web formats (HEIC, TIFF, BMP, etc.) to JPEG
    const convertedPath = await convertToJpegIfNeeded(file.path, file.originalname);
    const convertedFilename = path.basename(convertedPath);

    // Build relative image path (user/{date}/filename)
    const currentDate = new Date().toISOString().split("T")[0];
    const relativeImagePath = `${currentDate}/${convertedFilename}`;

    // Update user image with relative path only
    const [updatedUser] = await db
      .update(users)
      .set({
        image: relativeImagePath,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    console.log("Profile image database update result:", {
      userId,
      relativeImagePath,
      updatedImage: updatedUser?.image,
      updatedUserFound: !!updatedUser,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "کاربر پیدا نشد" });
    }

    return res.status(200).json({
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        city: updatedUser.city,
        email: updatedUser.email,
        image: updatedUser.image,
        isCoach: updatedUser.isCoach ?? false,
        coachVerificationStatus: updatedUser.coachVerificationStatus ?? "none",
        coachHeadline: updatedUser.coachHeadline,
        coachExperienceYears: updatedUser.coachExperienceYears,
        coachHourlyPrice: updatedUser.coachHourlyPrice,
        coachSpecialties: updatedUser.coachSpecialties,
        coachCertifications: updatedUser.coachCertifications,
        coachLanguages: updatedUser.coachLanguages,
      },
    });
  } catch (error) {
    console.error("Upload profile image error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
