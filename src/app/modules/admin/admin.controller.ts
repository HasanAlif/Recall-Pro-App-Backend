import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { adminService } from "./admin.service";
import { ContentType } from "./appContent.model";

const getContentTypeName = (type: string): string => {
  const typeNames: Record<string, string> = {
    [ContentType.ABOUT_US]: "About Us",
    [ContentType.PRIVACY_POLICY]: "Privacy Policy",
    [ContentType.TERMS_AND_CONDITIONS]: "Terms and Conditions",
  };
  return typeNames[type] || type;
};

const createOrUpdateContent = catchAsync(async (req, res) => {
  const { type } = req.params;
  const { content } = req.body;
  const result = await adminService.createOrUpdateContent(
    type as ContentType,
    content,
  );

  const contentTypeName = getContentTypeName(type);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${contentTypeName} updated successfully`,
    data: result,
  });
});

const getContentByType = catchAsync(async (req, res) => {
  const { type } = req.params;
  const result = await adminService.getContentByType(type as ContentType);

  const contentTypeName = getContentTypeName(type);
  const message = result._id
    ? `${contentTypeName} retrieved successfully`
    : `${contentTypeName} not yet created`;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result,
  });
});

const dashboardOverviewData = catchAsync(async (req, res) => {
  const result = await adminService.dashboardOverviewData();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard overview retrieved successfully",
    data: result,
  });
});

const getMonthlyUserGrowth = catchAsync(async (req, res) => {
  const yearQuery = Array.isArray(req.query.year)
    ? req.query.year[0]
    : req.query.year;
  const year = Number(yearQuery);

  const result = await adminService.getMonthlyUserGrowth(year);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Monthly user growth retrieved successfully",
    data: result,
  });
});

const getMonthlyPremiumUsersGrowth = catchAsync(async (req, res) => {
  const yearQuery = Array.isArray(req.query.year)
    ? req.query.year[0]
    : req.query.year;
  const year = Number(yearQuery);

  const result = await adminService.getMonthlyPremiumUsersGrowth(year);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Monthly premium users growth retrieved successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req, res) => {
  const statusQuery = Array.isArray(req.query.status)
    ? (req.query.status[0] as string)
    : (req.query.status as string | undefined);

  const status = statusQuery?.toLowerCase();

  if (status !== undefined && status !== "active" && status !== "inactive") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid status value. Use 'active' or 'inactive'.",
    );
  }

  const result = await adminService.getAllUsers(status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
});

const getPremiumUsers = catchAsync(async (req, res) => {
  const planQuery = Array.isArray(req.query.plan)
    ? (req.query.plan[0] as string)
    : (req.query.plan as string | undefined);

  const plan = planQuery?.toLowerCase();

  if (plan !== undefined && plan !== "monthly" && plan !== "yearly") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid plan value. Use 'monthly' or 'yearly'.",
    );
  }

  const result = await adminService.getPremiumUsers(plan);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Premium users retrieved successfully",
    data: result,
  });
});

export const adminController = {
  createOrUpdateContent,
  getContentByType,
  dashboardOverviewData,
  getMonthlyUserGrowth,
  getMonthlyPremiumUsersGrowth,
  getAllUsers,
  getPremiumUsers,
};
