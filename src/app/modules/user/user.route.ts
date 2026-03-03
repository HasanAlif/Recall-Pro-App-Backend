import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { UserValidation } from "./user.validation";
import { userController } from "./user.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "../../models";
import { fileUploader } from "../../../helpars/fileUploader";

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

// Update profile image
router.put(
  "/profile-image",
  auth(),
  fileUploader.uploadSingle,
  userController.profileImageChange,
);

// Update profile with optional image
router.put(
  "/profile",
  auth(),
  fileUploader.uploadSingle,
  userController.updateProfile,
);

// Update account details
router.patch(
  "/account",
  auth(),
  validateRequest(UserValidation.UpdateProfileSchema),
  userController.accountUpdate,
);

// Update own plan
router.patch(
  "/plan",
  auth(),
  validateRequest(UserValidation.UpdatePlanSchema),
  userController.updatePlan,
);

// Delete own account
router.delete("/me", auth(), userController.deleteMe);

// Admin: Get all users
router.get("/", auth(UserRole.ADMIN), userController.getUsers);

// Admin: Update user by ID
router.put("/:id", auth(UserRole.ADMIN), userController.updateUser);

export const userRoutes = router;
