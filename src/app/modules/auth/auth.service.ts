import * as bcrypt from "bcrypt";
import crypto from "crypto";
import { Request } from "express";
import httpStatus from "http-status";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpars/jwtHelpers";
import emailSender from "../../../shared/emailSender";
import { PASSWORD_RESET_TEMPLATE } from "../../../utils/Template";
import { AuthProvider, User } from "../../models";
import { authValidation } from "./auth.validation";

// User login
const loginUser = async (payload: {
  email: string;
  password: string;
  fcmToken?: string;
}) => {
  const userData = await User.findOne({ email: payload.email })
    .select("+password")
    .lean();

  if (!userData) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid email or password");
  }

  if (userData.status !== "ACTIVE") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Your account is inactive or blocked",
    );
  }

  // Check if user is verified
  if (!userData.isVerified) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Please verify your email before logging in",
    );
  }

  // Check if user is Google-only (no password)
  if (!userData.password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This account uses Google sign-in. Please continue with Google.",
    );
  }

  const isPasswordValid = await bcrypt.compare(
    payload.password,
    userData.password,
  );
  if (!isPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // Update FCM token if provided
  if (payload.fcmToken) {
    await User.findByIdAndUpdate(userData._id, { fcmToken: payload.fcmToken });
  }

  const accessToken = jwtHelpers.generateToken(
    {
      id: userData._id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  const {
    password,
    resetPasswordOtp,
    resetPasswordOtpExpiry,
    ...userWithoutSensitive
  } = userData;

  return { token: accessToken, user: userWithoutSensitive };
};

// Get user profile
const getMyProfile = async (userId: string) => {
  const userProfile = await User.findById(userId)
    .select(
      "_id fullName email mobileNumber profilePicture role status premiumPlan premiumPlanExpiry isEnjoyedTrial country currency language timezone monthStartDate createdAt",
    )
    .lean();

  if (!userProfile) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return userProfile;
};

// Change password
const changePassword = async (
  userId: string,
  newPassword: string,
  oldPassword: string,
) => {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Check if user has a password (Google users might not)
  if (!user.password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot change password for Google sign-in accounts. Please set a password first.",
    );
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await User.findByIdAndUpdate(userId, { password: hashedPassword });

  return { message: "Password changed successfully" };
};

// Forgot password - Send OTP
const forgotPassword = async (payload: { email: string }) => {
  const user = await User.findOne({ email: payload.email });

  if (!user) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "No account found with this email",
    );
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await User.findByIdAndUpdate(user._id, {
    resetPasswordOtp: otp,
    resetPasswordOtpExpiry: otpExpiry,
  });

  await emailSender(
    payload.email,
    PASSWORD_RESET_TEMPLATE(otp),
    "Password Reset OTP - Recall Pro",
  );

  return { message: "OTP sent to your email", otp }; // Return OTP for testing purposes only
};

// Resend OTP
const resendOtp = async (email: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "No account found with this email",
    );
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

  await User.findByIdAndUpdate(user._id, {
    resetPasswordOtp: otp,
    resetPasswordOtpExpiry: otpExpiry,
  });

  await emailSender(
    email,
    PASSWORD_RESET_TEMPLATE(otp),
    "Password Reset OTP - Recall Pro",
  );

  return { message: "OTP resent to your email", otp }; // Return OTP for testing purposes only
};

// Verify OTP
const verifyForgotPasswordOtp = async (payload: {
  email: string;
  otp: string;
}) => {
  const user = await User.findOne({ email: payload.email }).select(
    "+resetPasswordOtp +resetPasswordOtpExpiry",
  );

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (
    !user.resetPasswordOtp ||
    !user.resetPasswordOtpExpiry ||
    user.resetPasswordOtp !== payload.otp ||
    user.resetPasswordOtpExpiry < new Date()
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  return { message: "OTP verified successfully", isValid: true };
};

// Reset password
const resetPassword = async (
  email: string,
  newPassword: string,
  confirmPassword: string,
  otp: string,
) => {
  if (newPassword !== confirmPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Passwords do not match");
  }

  const user = await User.findOne({ email }).select(
    "+resetPasswordOtp +resetPasswordOtpExpiry",
  );

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (
    !user.resetPasswordOtp ||
    !user.resetPasswordOtpExpiry ||
    user.resetPasswordOtp !== otp ||
    user.resetPasswordOtpExpiry < new Date()
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await User.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    resetPasswordOtp: undefined,
    resetPasswordOtpExpiry: undefined,
  });

  return { message: "Password reset successfully" };
};

// Social Login (Google)
const socialLogin = async (req: Request) => {
  const providerId = req.body?.provider as string;

  if (!providerId || !AuthProvider[providerId as keyof typeof AuthProvider]) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${providerId} is not supported. Supported providers: ${Object.values(AuthProvider).join(", ")}`,
    );
  }

  const userData = await findOrCreateSocialUser(req);

  if (!userData) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to authenticate user");
  }

  if (userData.authProvider !== providerId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `This email is registered with ${userData.authProvider}. Please use ${userData.authProvider} to login.`,
    );
  }

  if (userData.status !== "ACTIVE") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Your account is inactive or blocked",
    );
  }

  const accessToken = jwtHelpers.generateToken(
    {
      id: userData._id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  const {
    password,
    resetPasswordOtp,
    resetPasswordOtpExpiry,
    ...userWithoutSensitive
  } = userData;

  return { token: accessToken, user: userWithoutSensitive };
};

// Find or create user from social login data
const findOrCreateSocialUser = async (req: Request) => {
  const validation =
    await authValidation.socialLoginValidationSchema.safeParseAsync(req.body);

  if (!validation.success) {
    const errorMessage = validation.error.errors
      .map((err) => err.message)
      .join(", ");
    throw new ApiError(httpStatus.BAD_REQUEST, errorMessage);
  }

  const { email, name, provider, providerId, profileImage } = validation.data;

  let userData = await User.findOne({ email }).lean();

  if (!userData) {
    // Create new user with social provider
    const newUser = await User.create({
      fullName: name,
      email,
      googleId: providerId,
      ...(profileImage && { profilePicture: profileImage }),
      authProvider: provider as AuthProvider,
      isVerified: true,
    });
    userData = await User.findById(newUser._id).lean();
  } else if (userData.authProvider === AuthProvider.GOOGLE) {
    // Update Google ID if user already has GOOGLE provider
    if (userData.googleId !== providerId) {
      await User.findByIdAndUpdate(userData._id, {
        googleId: providerId,
        ...(profileImage &&
          !userData.profilePicture && { profilePicture: profileImage }),
      });
      userData = await User.findById(userData._id).lean();
    }
  }
  // If user exists with LOCAL provider, don't modify - let socialLogin handle the error

  return userData;
};

export const authService = {
  loginUser,
  getMyProfile,
  changePassword,
  forgotPassword,
  resendOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  socialLogin,
};
