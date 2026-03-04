import { User, IUser, PremiumPlan } from "../../models";
import * as bcrypt from "bcrypt";
import crypto from "crypto";
import { Request } from "express";
import httpStatus from "http-status";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { fileUploader } from "../../../helpars/fileUploader";
import { jwtHelpers } from "../../../helpars/jwtHelpers";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import emailSender from "../../../shared/emailSender";
import { EMAIL_VERIFICATION_TEMPLATE } from "../../../utils/Template";
import { userSearchAbleFields } from "./user.costant";
import { IUserFilterRequest } from "./user.interface";

// Create a new user - Registration with OTP verification
const createUserIntoDb = async (payload: {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
}) => {
  // Check if user already exists and is verified
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser && existingUser.isVerified) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  // Check if mobile number already exists (among verified users)
  const existingMobile = await User.findOne({
    mobileNumber: payload.mobileNumber,
    isVerified: true,
  });
  if (existingMobile) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "User with this mobile number already exists",
    );
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );

  // Generate OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  let user;

  if (existingUser && !existingUser.isVerified) {
    // Update existing unverified user with new data
    user = await User.findByIdAndUpdate(
      existingUser._id,
      {
        fullName: payload.fullName,
        mobileNumber: payload.mobileNumber,
        password: hashedPassword,
        verificationOtp: otp,
        verificationOtpExpiry: otpExpiry,
      },
      { new: true },
    );
  } else {
    // Create new user with isVerified: false
    user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      mobileNumber: payload.mobileNumber,
      password: hashedPassword,
      isVerified: false,
      verificationOtp: otp,
      verificationOtpExpiry: otpExpiry,
    });
  }

  // Send verification OTP email
  await emailSender(
    payload.email,
    EMAIL_VERIFICATION_TEMPLATE(otp),
    "Email Verification OTP - Recall Pro",
  );

  return {
    message: "OTP sent to your email. Please verify to complete registration.",
    email: payload.email,
    otp,
  };
};

// Verify registration OTP and activate user
const verifyRegistrationOtp = async (payload: {
  email: string;
  otp: string;
}) => {
  const user = await User.findOne({ email: payload.email }).select(
    "+verificationOtp +verificationOtpExpiry",
  );

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.isVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");
  }

  if (
    !user.verificationOtp ||
    !user.verificationOtpExpiry ||
    user.verificationOtp !== payload.otp ||
    user.verificationOtpExpiry < new Date()
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  // Mark user as verified and clear OTP fields
  await User.findByIdAndUpdate(user._id, {
    isVerified: true,
    verificationOtp: undefined,
    verificationOtpExpiry: undefined,
  });

  // Generate token
  const token = jwtHelpers.generateToken(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  return {
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  };
};

// Resend registration OTP
const resendRegistrationOtp = async (email: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.isVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");
  }

  // Generate new OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

  await User.findByIdAndUpdate(user._id, {
    verificationOtp: otp,
    verificationOtpExpiry: otpExpiry,
  });

  // Send verification OTP email
  await emailSender(
    email,
    EMAIL_VERIFICATION_TEMPLATE(otp),
    "Email Verification OTP - Recall Pro",
  );

  return {
    message: "OTP resent to your email",
    email,
    otp,
  };
};

// System-only statuses — users cannot request these directly
const REQUESTABLE_PLANS = new Set<PremiumPlan>([
  PremiumPlan.TRIAL,
  PremiumPlan.BASIC_MONTHLY,
  PremiumPlan.BASIC_ANNUAL,
  PremiumPlan.PREMIUM_MONTHLY,
  PremiumPlan.PREMIUM_ANNUAL,
]);

// const PAID_REQUESTABLE_PLANS = new Set<PremiumPlan>([
//   PremiumPlan.BASIC_MONTHLY,
//   PremiumPlan.BASIC_ANNUAL,
//   PremiumPlan.PREMIUM_MONTHLY,
//   PremiumPlan.PREMIUM_ANNUAL,
// ]);

// Duration in ms for each plan
const PLAN_DURATION_MS: Record<string, number> = {
  [PremiumPlan.TRIAL]: 30 * 24 * 60 * 60 * 1000,
  [PremiumPlan.BASIC_MONTHLY]: 30 * 24 * 60 * 60 * 1000,
  [PremiumPlan.BASIC_ANNUAL]: 365 * 24 * 60 * 60 * 1000,
  [PremiumPlan.PREMIUM_MONTHLY]: 30 * 24 * 60 * 60 * 1000,
  [PremiumPlan.PREMIUM_ANNUAL]: 365 * 24 * 60 * 60 * 1000,
};

const updateUserPlan = async (userId: string, plan: PremiumPlan) => {
  // Reject system-managed statuses
  if (!REQUESTABLE_PLANS.has(plan)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid plan selected");
  }

  const user = await User.findById(userId).select("isEnjoyedTrial").lean();
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // One-time trial guard
  if (plan === PremiumPlan.TRIAL && user.isEnjoyedTrial) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You have already enjoyed the free trial. Please choose a paid plan.",
    );
  }

  const updateData: Record<string, any> = {
    premiumPlan: plan,
    premiumPlanExpiry: new Date(Date.now() + PLAN_DURATION_MS[plan]),
  };

  // Permanently mark trial consumed so it can never be re-claimed
  if (plan === PremiumPlan.TRIAL) {
    updateData.isEnjoyedTrial = true;
  }

  // if (PAID_REQUESTABLE_PLANS.has(plan)) {
  //   updateData.$push = {
  //     premiumPlanHistory: {
  //       plan,
  //       purchasedAt: new Date(),
  //     },
  //   };
  // }

  const result = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    select:
      "_id fullName email mobileNumber profilePicture role premiumPlan premiumPlanExpiry isEnjoyedTrial",
  }).lean();

  return result;
};

export const userService = {
  createUserIntoDb,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  updateUserPlan,
};
