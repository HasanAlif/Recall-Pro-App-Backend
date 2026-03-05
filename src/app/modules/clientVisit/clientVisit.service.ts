import { Request } from "express";
import httpStatus from "http-status";
import mongoose from "mongoose";
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

  const files = req.files as
    | { photos?: Express.Multer.File[]; videos?: Express.Multer.File[] }
    | undefined;

  // Upload photos to Cloudinary
  if (files?.photos && files.photos.length > 0) {
    const photoResults = await Promise.all(
      files.photos.map((file) =>
        fileUploader.uploadToCloudinary(file, "visit-photos"),
      ),
    );
    visitData.photos = photoResults.map((r) => r.Location);
  }

  // Upload videos to Google Cloud Storage
  if (files?.videos && files.videos.length > 0) {
    const videoResults = await Promise.all(
      files.videos.map((file) =>
        fileUploader.uploadVideoToGCS(file, "visit-videos"),
      ),
    );
    visitData.videos = videoResults.map((r) => r.Location);
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

  const client = await verifyClientOwnership(params.clientId, userId);

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const whereConditions = { clientId: params.clientId };

  const sortConditions: Record<string, 1 | -1> = {};
  sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;

  const [data, total, aggregation] = await Promise.all([
    ClientVisit.find(whereConditions)
      .select("_id clientId date serviceType serviceNotes photos")
      .sort(sortConditions)
      .skip(skip)
      .limit(limit)
      .lean(),
    ClientVisit.countDocuments(whereConditions),
    ClientVisit.aggregate([
      {
        $match: {
          clientId: new mongoose.Types.ObjectId(params.clientId),
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: {
            $sum: {
              $add: [
                { $ifNull: ["$servicePrice", 0] },
                { $ifNull: ["$tips", 0] },
              ],
            },
          },
          totalVisit: { $sum: 1 },
        },
      },
    ]),
  ]);

  const stats = aggregation[0] || { totalSpent: 0, totalVisit: 0 };

  const clientInfo = {
    picture: client.picture || "",
    clientName: client.fullName,
    clientSince: new Date(client.createdAt).getFullYear().toString(),
    totalVisit: stats.totalVisit,
    notes: client.notes || "",
    Phone: client.phoneNumber || "",
    email: client.email || "",
    totalSpent: stats.totalSpent,
  };

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    clientInfo,
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

const getAllVisits = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
) => {
  const clientIds = await Client.find({ userId }).distinct("_id");

  const skip = (page - 1) * limit;
  const matchFilter = { clientId: { $in: clientIds } };

  const [visits, totalCount] = await Promise.all([
    ClientVisit.aggregate([
      { $match: matchFilter },
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          clientId: 1,
          clientName: { $ifNull: ["$client.fullName", ""] },
          serviceType: 1,
          photos: 1,
          videos: 1,
          date: 1,
        },
      },
    ]),
    ClientVisit.countDocuments(matchFilter),
  ]);

  return {
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
    visits,
  };
};

// Escape regex special characters to prevent ReDoS
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchVisitsByServiceType = async (
  userId: string,
  serviceType: string,
) => {
  const trimmed = serviceType.trim();
  if (!trimmed) {
    throw new ApiError(httpStatus.BAD_REQUEST, "serviceType cannot be empty");
  }

  const escaped = escapeRegex(trimmed);
  const clientIds = await Client.find({ userId }).distinct("_id");

  const visits = await ClientVisit.aggregate([
    {
      $match: {
        clientId: { $in: clientIds },
        serviceType: { $regex: escaped, $options: "i" },
      },
    },
    {
      $addFields: {
        score: {
          $switch: {
            branches: [
              // Exact match
              {
                case: {
                  $regexMatch: {
                    input: "$serviceType",
                    regex: `^${escaped}$`,
                    options: "i",
                  },
                },
                then: 3,
              },
              // Starts with
              {
                case: {
                  $regexMatch: {
                    input: "$serviceType",
                    regex: `^${escaped}`,
                    options: "i",
                  },
                },
                then: 2,
              },
            ],
            // Contains anywhere
            default: 1,
          },
        },
      },
    },
    { $sort: { score: -1, date: -1 } },
    { $limit: 50 },
    {
      $lookup: {
        from: "clients",
        localField: "clientId",
        foreignField: "_id",
        as: "client",
      },
    },
    { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        clientId: 1,
        serviceType: 1,
        photos: 1,
        videos: 1,
        date: 1,
        clientName: { $ifNull: ["$client.fullName", ""] },
      },
    },
  ]);

  return visits;
};

export const clientVisitService = {
  createVisit,
  getVisits,
  getVisitById,
  getAllVisits,
  searchVisitsByServiceType,
};
