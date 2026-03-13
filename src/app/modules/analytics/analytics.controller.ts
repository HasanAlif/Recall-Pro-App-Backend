import { Request, Response } from "express";
import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { analyticsService } from "./analytics.service";

const VALID_FILTERS = ["today", "7-days", "30-days", "all-time"] as const;

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const raw = (req.query.filter as string) || "today";
  const filter = VALID_FILTERS.includes(raw as any)
    ? (raw as (typeof VALID_FILTERS)[number])
    : "today";
  const result = await analyticsService.getAnalyticsData(req.user.id, filter);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Analytics data retrieved successfully!",
    data: result,
  });
});

const getRevenueBreakDown = catchAsync(async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (!year || !month || month < 1 || month > 12) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message:
        "Valid year and month (1-12) are required. Example: ?year=2026&month=02",
      data: null,
    });
  }

  const result = await analyticsService.revenueBreakDown(
    req.user.id,
    year,
    month,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Revenue breakdown retrieved successfully!",
    data: result,
  });
});

export const analyticsController = {
  getAnalytics,
  getRevenueBreakDown,
};
