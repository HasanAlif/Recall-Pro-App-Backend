import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import pick from "../../../shared/pick";
import sendResponse from "../../../shared/sendResponse";
import { userFilterableFields } from "./user.costant";
import { userService } from "./user.service";

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

// Get all users
const getUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, userFilterableFields);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);

  const result = await userService.getUsersFromDb(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully!",
    meta: result.meta,
    data: result.data,
  });
});

// Update profile
const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.updateProfile(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully!",
    data: result,
  });
});

// Update user (Admin)
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.updateUserIntoDb(req.body, req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully!",
    data: result,
  });
});

// Update profile image
const profileImageChange = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.profileImageChange(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile image updated successfully!",
    data: result,
  });
});

// Update account
const accountUpdate = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.accountUpdateIntoDb(req.body, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Account updated successfully!",
    data: result,
  });
});

// Delete account
const deleteMe = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.deleteUserFromDb(req.user.id);

  res.clearCookie("token");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Account deleted successfully!",
    data: result,
  });
});

export const userController = {
  createUser,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  getUsers,
  updateProfile,
  updateUser,
  accountUpdate,
  deleteMe,
  profileImageChange,
};
