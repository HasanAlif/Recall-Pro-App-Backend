import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import pick from "../../../shared/pick";
import sendResponse from "../../../shared/sendResponse";
import ApiError from "../../../errors/ApiErrors";
import { clientService } from "./client.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await clientService.createClient(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Client created successfully!",
    data: result,
  });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await clientService.getClients(req.user.id, filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Clients retrieved successfully!",
    meta: result.meta,
    data: result.data,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await clientService.updateClient(req, req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Client updated successfully!",
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const result = await clientService.deleteClient(req.params.id, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Client deleted successfully!",
    data: result,
  });
});

const getHomePageData = catchAsync(async (req: Request, res: Response) => {
  const result = await clientService.getHomePageData(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Home page data retrieved successfully!",
    data: result,
  });
});

const search = catchAsync(async (req: Request, res: Response) => {
  const name = (req.query.name as string) ?? "";
  if (!name.trim()) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Query param 'name' is required",
    );
  }
  const result = await clientService.searchClientByName(req.user.id, name);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Clients retrieved successfully!",
    data: result,
  });
});

export const clientController = {
  create,
  getAll,
  update,
  remove,
  getHomePageData,
  search,
};
