import { z } from "zod";

// Registration validation - simple: fullName, mobileNumber, email, password
const CreateUserValidationSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  email: z.string().email("Please provide a valid email"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Login validation
const UserLoginValidationSchema = z.object({
  email: z.string().email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Profile update validation
const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  mobileNumber: z.string().min(10).optional(),
});

// Verify registration OTP
const VerifyRegistrationOtpSchema = z.object({
  email: z.string().email("Please provide a valid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

// Resend registration OTP
const ResendRegistrationOtpSchema = z.object({
  email: z.string().email("Please provide a valid email"),
});

// Update plan
const UpdatePlanSchema = z.object({
  plan: z.enum(
    [
      "TRIAL",
      "BASIC_MONTHLY",
      "BASIC_ANNUAL",
      "PREMIUM_MONTHLY",
      "PREMIUM_ANNUAL",
    ],
    { required_error: "Plan is required" },
  ),
});

export const UserValidation = {
  CreateUserValidationSchema,
  UserLoginValidationSchema,
  UpdateProfileSchema,
  VerifyRegistrationOtpSchema,
  ResendRegistrationOtpSchema,
  UpdatePlanSchema,
};
