import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import pick from "../../../shared/pick";
import sendResponse from "../../../shared/sendResponse";
import { userFilterableFields } from "./user.costant";
import { userService } from "./user.service";
import { PremiumPlan } from "../../models";

// Register new user - sends OTP
const createUser = catchAsync(async (req: Request, res: Response) => {
  const { fullName, email, mobileNumber, password } = req.body;
  const result = await userService.createUserIntoDb({
    fullName,
    email,
    mobileNumber,
    password,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP sent to your email. Please verify to complete registration.",
    data: result,
  });
});

// Verify registration OTP
const verifyRegistrationOtp = catchAsync(
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await userService.verifyRegistrationOtp({ email, otp });

    // Set token in cookie after successful verification
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Email verified and registration completed successfully!",
      data: result,
    });
  },
);

// Resend registration OTP
const resendRegistrationOtp = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await userService.resendRegistrationOtp(email);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "OTP resent to your email",
      data: result,
    });
  },
);

// Update own plan
const updatePlan = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.updateUserPlan(
    req.user.id,
    req.body.plan as PremiumPlan,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Plan updated successfully!",
    data: result,
  });
});

export const userController = {
  createUser,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  updatePlan,
};
