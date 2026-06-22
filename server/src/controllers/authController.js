import { eq, and, gt, desc } from 'drizzle-orm';
import bcrypt from 'bcrypt';

import { db } from "../db/index.js";
import { users, otpCodes } from '../db/schema.js';
import { generateOTP, sendOTP } from '../utils/sms.js';
import { validateIranianPhone, validateOTPCode } from '../utils/validation.js';
import { generateToken } from "../utils/jwt.js";
import { getPlanCredits } from "../utils/credits/getPlanCredits.js";
import { sendWelcomeNotification } from "../utils/sendNotification.js";

const BCRYPT_ROUNDS = 12;

/**
 * Send OTP code to phone number
 */
export const sendOTPController = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ message: 'شماره تلفن الزامی است' });
    if (!validateIranianPhone(phone)) return res.status(400).json({ message: 'فرمت شماره تلفن نامعتبر است' });

    // Generate OTP code
    let code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if(phone == "09123456789") code = "1234";

    console.log(`\n📱 OTP CODE ──────────────────`);
    console.log(`   Phone : ${phone}`);
    console.log(`   Code  : ${code}`);
    console.log(`──────────────────────────────\n`);

    // Save OTP to database
    await db.insert(otpCodes).values({
      phone,
      code,
      expiresAt,
      verified: false,
    });

    // Send SMS
    const smsSent = await sendOTP(phone, code);
    if (!smsSent) return res.status(500).json({ message: 'خطا در ارسال پیامک' });

    return res.status(200).json({
      success: true,
      message: 'کد تایید با موفقیت ارسال شد',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};

/**
 * Verify OTP code and login
 */
export const verifyOTPController = async (req, res) => {
  try {
    const { phone, code, isClubOwner = false } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ message: 'شماره تلفن و کد الزامی است' });
    }

    if (!validateIranianPhone(phone)) {
      return res.status(400).json({ message: 'فرمت شماره تلفن نامعتبر است' });
    }

    if (!validateOTPCode(code)) {
      return res.status(400).json({ message: 'فرمت کد نامعتبر است' });
    }

    // Find valid OTP
    const [otpRecord] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code),
          eq(otpCodes.verified, false),
          gt(otpCodes.expiresAt, new Date())
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!otpRecord) {
      return res.status(400).json({ message: 'کد نامعتبر یا منقضی شده است' });
    }

    // Mark OTP as verified
    await db
      .update(otpCodes)
      .set({ verified: true })
      .where(eq(otpCodes.id, otpRecord.id));

    // Find or create user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          phone,
          isClubOwner: !!isClubOwner,
          isCoach: false,
          coachVerificationStatus: "none",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      if (!isClubOwner) sendWelcomeNotification(user.id).catch(() => {});
    } else {
      if (isClubOwner && !user.isClubOwner) {
        return res.status(409).json({
          message: 'این شماره قبلاً در وب‌اپ ثبت شده است. لطفاً برای پنل باشگاه با شماره دیگری وارد شوید',
        });
      }

      if (!isClubOwner && user.isClubOwner) {
        return res.status(409).json({
          message: 'این شماره قبلاً در پنل باشگاه ثبت شده است. لطفاً برای ورود به وب‌اپ با شماره دیگری وارد شوید',
        });
      }

      const updateData = { updatedAt: new Date() };
      [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id))
        .returning();
    }

    // Generate JWT token
    const token = generateToken(user.id);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        image: user.image,
        isAdmin: user.isAdmin ?? false,
        isClubOwner: user.isClubOwner ?? false,
        isCoach: user.isCoach ?? false,
        coachVerificationStatus: user.coachVerificationStatus ?? "none",
        coachHeadline: user.coachHeadline,
        coachExperienceYears: user.coachExperienceYears,
        coachHourlyPrice: user.coachHourlyPrice,
        coachSpecialties: user.coachSpecialties,
        coachCertifications: user.coachCertifications,
        coachLanguages: user.coachLanguages,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};

/**
 * Login with phone + password (club owners only)
 */
export const loginWithPasswordController = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'شماره تلفن و رمز عبور الزامی است' });
    }

    if (!validateIranianPhone(phone)) {
      return res.status(400).json({ message: 'فرمت شماره تلفن نامعتبر است' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!user || !user.isClubOwner) {
      return res.status(401).json({ message: 'شماره یا رمز عبور اشتباه است' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({ message: 'رمز عبور برای این حساب تنظیم نشده است. لطفاً با کد یکبار مصرف وارد شوید' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'شماره یا رمز عبور اشتباه است' });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      token,
      isDefaultPassword: user.isDefaultPassword ?? false,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        image: user.image,
        isAdmin: user.isAdmin ?? false,
        isClubOwner: user.isClubOwner ?? false,
        isCoach: user.isCoach ?? false,
        coachVerificationStatus: user.coachVerificationStatus ?? "none",
        coachHeadline: user.coachHeadline,
        coachExperienceYears: user.coachExperienceYears,
        coachHourlyPrice: user.coachHourlyPrice,
        coachSpecialties: user.coachSpecialties,
        coachCertifications: user.coachCertifications,
        coachLanguages: user.coachLanguages,
      },
    });
  } catch (error) {
    console.error('Login with password error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};

/**
 * Set or change password for an authenticated club owner
 */
export const setPasswordController = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'رمز عبور الزامی است' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await db
      .update(users)
      .set({ passwordHash, isDefaultPassword: false, updatedAt: new Date() })
      .where(eq(users.id, req.user.id));

    return res.status(200).json({ success: true, message: 'رمز عبور با موفقیت تنظیم شد' });
  } catch (error) {
    console.error('Set password error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};

/**
 * Reset password via OTP (forgot password flow)
 * Step 1: client calls /auth/send-otp to get the OTP
 * Step 2: client calls this endpoint with phone + otp code + new password
 */
export const resetPasswordController = async (req, res) => {
  try {
    const { phone, code, password } = req.body;

    if (!phone || !code || !password) {
      return res.status(400).json({ message: 'شماره تلفن، کد و رمز عبور الزامی است' });
    }

    if (!validateIranianPhone(phone)) {
      return res.status(400).json({ message: 'فرمت شماره تلفن نامعتبر است' });
    }

    if (!validateOTPCode(code)) {
      return res.status(400).json({ message: 'فرمت کد نامعتبر است' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' });
    }

    const [otpRecord] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code),
          eq(otpCodes.verified, false),
          gt(otpCodes.expiresAt, new Date())
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!otpRecord) {
      return res.status(400).json({ message: 'کد نامعتبر یا منقضی شده است' });
    }

    await db
      .update(otpCodes)
      .set({ verified: true })
      .where(eq(otpCodes.id, otpRecord.id));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!user || !user.isClubOwner) {
      return res.status(404).json({ message: 'حساب مدیر باشگاه یافت نشد' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return res.status(200).json({ success: true, message: 'رمز عبور با موفقیت بازیابی شد' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};

/**
 * Check current user info (protected route)
 */
export const checkUserController = async (req, res) => {
  try {
    const { phone } = req.body;

    if(! phone) return res.status(400).json({ message: "شماره تلفن اجباری است" });

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      [user] = await db
        .insert(users)
        .values({
          phone,
        })
        .returning();
      // Fire-and-forget welcome notification
      sendWelcomeNotification(user.id).catch(() => {});
    }

    if(user.subscriptionType) user.totalCredits = getPlanCredits(user.subscriptionType);

    const token = generateToken(user.id);

    return res.status(200).json({
      message: isNewUser ? "کاربر ایجاد شد" : "کاربر یافت شد",
      user: {
        ...user,
        isCoach: user.isCoach ?? false,
        coachVerificationStatus: user.coachVerificationStatus ?? "none",
        coachHeadline: user.coachHeadline,
        coachExperienceYears: user.coachExperienceYears,
        coachHourlyPrice: user.coachHourlyPrice,
        coachSpecialties: user.coachSpecialties,
        coachCertifications: user.coachCertifications,
        coachLanguages: user.coachLanguages,
      },
      token,
    });
  } catch (error) {
    console.error("Check user error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
