import { Request } from "express";
import httpStatus from "http-status";
import mongoose from "mongoose";
import { ClientVisit } from "./clientVisit.model";
import { Client } from "../client/client.model";
import { clientVisitValidation } from "./clientVisit.validation";
import ApiError from "../../../errors/ApiErrors";
import { fileUploader } from "../../../helpars/fileUploader";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";

const isGCSUrl = (url: string): boolean => {
  const bucket = process.env.GCS_BUCKET_NAME;
  return (
    !!bucket && url.startsWith(`https://storage.googleapis.com/${bucket}/`)
  );
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns signed video URLs for a visit, using the cached copy stored on the
 * document when it is still valid (>1 day left). Otherwise generates fresh
 * 7-day signed URLs and stores them in the background.
 */
const getCachedOrFreshSignedVideos = async (visit: any): Promise<string[]> => {
  const rawVideos: string[] = (visit.videos || []) as string[];
  if (!rawVideos.length || !rawVideos.some(isGCSUrl)) return rawVideos;

  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (
    visit.signedVideos?.length === rawVideos.length &&
    visit.videoUrlsExpiry &&
    new Date(visit.videoUrlsExpiry) > oneDayFromNow
  ) {
    return visit.signedVideos as string[];
  }

  const signed = await Promise.all(
    rawVideos.map((v) =>
      isGCSUrl(v)
        ? fileUploader.generateGCSSignedUrl(v, 10080)
        : Promise.resolve(v),
    ),
  );

  if (visit._id) {
    ClientVisit.findByIdAndUpdate(visit._id, {
      signedVideos: signed,
      videoUrlsExpiry: new Date(Date.now() + SEVEN_DAYS_MS),
    }).catch(() => {});
  }

  return signed;
};

const getAllServiceTypesForUser = async (userId: string): Promise<string[]> => {
  const clientIds = await Client.find({ userId }).distinct("_id");

  const result = await ClientVisit.distinct("serviceType", {
    clientId: { $in: clientIds },
    serviceType: { $exists: true, $nin: [null, ""] },
  });

  const unique = new Set<string>();
  for (const entry of result as string[]) {
    for (const part of entry.split(",")) {
      const trimmed = part.trim();
      if (trimmed) unique.add(trimmed);
    }
  }

  return Array.from(unique).sort();
};

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
  const obj = result.toObject();
  if (obj.videos?.length) {
    obj.videos = await getCachedOrFreshSignedVideos(obj);
  }
  return obj;
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

  const client = await verifyClientOwnership(visit.clientId.toString(), userId);

  const signedVideos = visit.videos?.length
    ? await getCachedOrFreshSignedVideos(visit)
    : visit.videos;
  return {
    visit: { ...visit, videos: signedVideos, visitorName: client.fullName },
    total: (visit.servicePrice ?? 0) + (visit.tips ?? 0),
  };
};

const updateVisitById = async (req: Request) => {
  const userId = req.user.id;
  const visitId = req.params.id;
  const validatedData = clientVisitValidation.updateSchema.parse(req.body);

  const existingVisit = await ClientVisit.findById(visitId);
  if (!existingVisit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Visit not found");
  }
  await verifyClientOwnership(existingVisit.clientId.toString(), userId);

  const updateData: Record<string, any> = { ...validatedData };

  const files = req.files as
    | { photos?: Express.Multer.File[]; videos?: Express.Multer.File[] }
    | undefined;

  // Handle photo replacement: upload new first, then delete old
  if (files?.photos && files.photos.length > 0) {
    const photoResults = await Promise.all(
      files.photos.map((file) =>
        fileUploader.uploadToCloudinary(file, "visit-photos"),
      ),
    );
    updateData.photos = photoResults.map((r) => r.Location);

    for (const oldUrl of existingVisit.photos || []) {
      fileUploader.deleteFromCloudinary(oldUrl);
    }
  }

  // Handle video replacement: upload new first, then delete old
  if (files?.videos && files.videos.length > 0) {
    const videoResults = await Promise.all(
      files.videos.map((file) =>
        fileUploader.uploadVideoToGCS(file, "visit-videos"),
      ),
    );
    updateData.videos = videoResults.map((r) => r.Location);
    updateData.signedVideos = [];
    updateData.videoUrlsExpiry = null;

    for (const oldUrl of existingVisit.videos || []) {
      fileUploader.deleteFromGCS(oldUrl);
    }
  }

  const result = await ClientVisit.findByIdAndUpdate(visitId, updateData, {
    new: true,
  }).lean();

  if (result && result.videos?.length) {
    result.videos = await getCachedOrFreshSignedVideos(result);
  }

  return result;
};

const deleteVisitById = async (visitId: string, userId: string) => {
  const visit = await ClientVisit.findById(visitId);
  if (!visit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Visit not found");
  }
  await verifyClientOwnership(visit.clientId.toString(), userId);

  for (const photoUrl of visit.photos || []) {
    fileUploader.deleteFromCloudinary(photoUrl);
  }
  for (const videoUrl of visit.videos || []) {
    fileUploader.deleteFromGCS(videoUrl);
  }

  await ClientVisit.findByIdAndDelete(visitId);
  return null;
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
          signedVideos: 1,
          videoUrlsExpiry: 1,
          date: 1,
        },
      },
    ]),
    ClientVisit.countDocuments(matchFilter),
  ]);

  const signedVisits = await Promise.all(
    visits.map(async (v) => ({
      ...v,
      videos: v.videos?.length
        ? await getCachedOrFreshSignedVideos(v)
        : v.videos,
    })),
  );

  return {
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
    visits: signedVisits,
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
        signedVideos: 1,
        videoUrlsExpiry: 1,
        date: 1,
        clientName: { $ifNull: ["$client.fullName", ""] },
      },
    },
  ]);

  const signedVisits = await Promise.all(
    visits.map(async (v) => ({
      ...v,
      videos: v.videos?.length
        ? await getCachedOrFreshSignedVideos(v)
        : v.videos,
    })),
  );
  return signedVisits;
};

export const clientVisitService = {
  createVisit,
  getVisits,
  getVisitById,
  updateVisitById,
  deleteVisitById,
  getAllVisits,
  searchVisitsByServiceType,
  getAllServiceTypesForUser,
};
