import { Request } from "express";
import httpStatus from "http-status";
import { v2 as cloudinary } from "cloudinary";
import { ClientVisit } from "./clientVisit.model";
import { Client } from "../client/client.model";
import { clientVisitValidation } from "./clientVisit.validation";
import ApiError from "../../../errors/ApiErrors";
import { fileUploader } from "../../../helpars/fileUploader";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";

const verifyClientOwnership = async (clientId: string, userId: string) => {
  const client = await Client.findOne({ _id: clientId, userId }).lean();
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
  }
  return client;
};

const createVisit = async (req: Request) => {
  const userId = req.user.id;
  const validatedData = clientVisitValidation.createSchema.parse(req.body);

  await verifyClientOwnership(validatedData.clientId, userId);

  const visitData: Record<string, any> = { ...validatedData };

  const files = req.files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const uploadResults = await Promise.all(
      files.map((file) =>
        fileUploader.uploadToCloudinary(file, "visit-photos"),
      ),
    );
    visitData.photos = uploadResults.map((r) => r.Location);
  }

  const result = await ClientVisit.create(visitData);
  return result.toObject();
};

const getVisits = async (
  userId: string,
  params: { clientId?: string },
  options: IPaginationOptions,
) => {
  if (!params.clientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Client ID is required");
  }

  await verifyClientOwnership(params.clientId, userId);

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const whereConditions = { clientId: params.clientId };

  const sortConditions: Record<string, 1 | -1> = {};
  sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;

  const [data, total] = await Promise.all([
    ClientVisit.find(whereConditions)
      .sort(sortConditions)
      .skip(skip)
      .limit(limit)
      .lean(),
    ClientVisit.countDocuments(whereConditions),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

const getVisitById = async (visitId: string, userId: string) => {
  const visit = await ClientVisit.findById(visitId).lean();

  if (!visit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Visit not found");
  }

  await verifyClientOwnership(visit.clientId.toString(), userId);

  return {
    visit,
    total: (visit.servicePrice ?? 0) + (visit.tips ?? 0),
  };
};

export const clientVisitService = {
  createVisit,
  getVisits,
  getVisitById,
};
