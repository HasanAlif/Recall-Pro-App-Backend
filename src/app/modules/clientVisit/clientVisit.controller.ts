import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import pick from "../../../shared/pick";
import sendResponse from "../../../shared/sendResponse";
import { clientVisitService } from "./clientVisit.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await clientVisitService.createVisit(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Visit created successfully!",
    data: result,
  });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["clientId"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await clientVisitService.getVisits(
    req.user.id,
    filters,
    options,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Visits retrieved successfully!",
    meta: result.meta,
    data: {
      clientInfo: result.clientInfo,
      visits: result.data,
    },
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const result = await clientVisitService.getVisitById(
    req.params.id,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Visit retrieved successfully!",
    data: result,
  });
});

const getAllVisits = catchAsync(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const result = await clientVisitService.getAllVisits(
    req.user.id,
    page,
    limit,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All visits retrieved successfully!",
    data: result,
  });
});

export const clientVisitController = {
  create,
  getAll,
  getById,
  getAllVisits,
};
