import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { UserValidation } from "./user.validation";
import { userController } from "./user.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "../../models";

const router = express.Router();

// Register new user (no auth required)
router.post(
  "/register",
  validateRequest(UserValidation.CreateUserValidationSchema),
  userController.createUser,
);

// Verify registration OTP (no auth required)
router.post(
  "/verify-registration",
  validateRequest(UserValidation.VerifyRegistrationOtpSchema),
  userController.verifyRegistrationOtp,
);

// Resend registration OTP (no auth required)
router.post(
  "/resend-registration-otp",
  validateRequest(UserValidation.ResendRegistrationOtpSchema),
  userController.resendRegistrationOtp,
);

// Update own plan
router.patch(
  "/plan",
  auth(UserRole.USER),
  validateRequest(UserValidation.UpdatePlanSchema),
  userController.updatePlan,
);

export const userRoutes = router;
