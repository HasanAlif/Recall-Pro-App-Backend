import { Request } from "express";
import httpStatus from "http-status";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Client } from "./client.model";
import { ClientVisit } from "../clientVisit/clientVisit.model";
import { clientValidation } from "./client.validation";
import ApiError from "../../../errors/ApiErrors";
import { fileUploader } from "../../../helpars/fileUploader";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";

// Extract Cloudinary public_id from URL
const getPublicIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  return match ? match[1] : null;
};

// Delete image from Cloudinary by URL (best-effort)
const deleteFromCloudinary = (url: string | undefined) => {
  if (!url) return;
  const publicId = getPublicIdFromUrl(url);
  if (publicId) {
    cloudinary.uploader.destroy(publicId).catch(() => {});
  }
};

// Escape regex special characters to prevent ReDoS
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Parse form-data body: handles both direct fields and JSON-wrapped "data" field
const parseBody = (body: any) => {
  if (body?.data) {
    try {
      return typeof body.data === "string" ? JSON.parse(body.data) : body.data;
    } catch {
      return body;
    }
  }
  return body;
};

// Create a new client
const createClient = async (req: Request) => {
  const userId = req.user.id;

  const validatedData = clientValidation.createSchema.parse(
    parseBody(req.body),
  );

  const clientData: Record<string, any> = {
    userId,
    ...validatedData,
  };

  // Upload picture to Cloudinary if provided
  if (req.file) {
    const uploaded = await fileUploader.uploadToCloudinary(
      req.file,
      "client-pictures",
    );
    clientData.picture = uploaded.Location;
  }

  const result = await Client.create(clientData);
  return result.toObject();
};

// Get all clients for the authenticated user
const getClients = async (
  userId: string,
  params: { searchTerm?: string },
  options: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const conditions: any[] = [{ userId: new mongoose.Types.ObjectId(userId) }];

  if (params.searchTerm) {
    const escaped = escapeRegex(params.searchTerm);
    conditions.push({
      $or: [
        { fullName: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { phoneNumber: { $regex: escaped, $options: "i" } },
      ],
    });
  }

  const matchStage = { $and: conditions };
  const sortConditions: Record<string, 1 | -1> = {};
  sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;

  const [data, total] = await Promise.all([
    Client.aggregate([
      { $match: matchStage },
      { $sort: sortConditions },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "clientvisits",
          let: { clientId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$clientId", "$$clientId"] } } },
            { $sort: { date: -1 } },
            { $limit: 1 },
            { $project: { serviceType: 1, _id: 0 } },
          ],
          as: "lastVisit",
        },
      },
      {
        $addFields: {
          last: {
            $ifNull: [{ $arrayElemAt: ["$lastVisit.serviceType", 0] }, ""],
          },
        },
      },
      { $project: { lastVisit: 0 } },
    ]),
    Client.countDocuments(matchStage),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

// Update a client
const updateClient = async (req: Request, clientId: string) => {
  const userId = req.user.id;

  const existingClient = await Client.findOne({
    _id: clientId,
    userId,
  }).lean();

  if (!existingClient) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
  }

  const updateData: Record<string, any> = {};

  const validatedData = clientValidation.updateSchema.parse(
    parseBody(req.body),
  );
  Object.assign(updateData, validatedData);

  // Handle picture: upload new first, then cleanup old
  if (req.file) {
    const uploaded = await fileUploader.uploadToCloudinary(
      req.file,
      "client-pictures",
    );
    updateData.picture = uploaded.Location;

    // Cleanup old picture from Cloudinary
    deleteFromCloudinary(existingClient.picture);
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No data provided for update");
  }

  const result = await Client.findByIdAndUpdate(clientId, updateData, {
    new: true,
  }).lean();

  return result;
};

// Delete a client
const deleteClient = async (clientId: string, userId: string) => {
  const client = await Client.findOneAndDelete({
    _id: clientId,
    userId,
  }).lean();

  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
  }

  // Cleanup picture from Cloudinary
  deleteFromCloudinary(client.picture);

  return null;
};

const getHomePageData = async (userId: string) => {
  // Get all client IDs belonging to this user
  const clientIds = await Client.find({ userId }).distinct("_id");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [totalClients, totalRecentVisits, recentVisits] = await Promise.all([
    Client.countDocuments({ userId }),
    ClientVisit.countDocuments({
      clientId: { $in: clientIds },
      createdAt: { $gte: sevenDaysAgo },
    }),
    // Get recent visits with unique clients, most recent first
    ClientVisit.aggregate([
      { $match: { clientId: { $in: clientIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$clientId",
          lastVisitDate: { $first: "$createdAt" },
          serviceType: { $first: "$serviceType" },
        },
      },
      { $sort: { lastVisitDate: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "clients",
          localField: "_id",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: "$client" },
      {
        $project: {
          _id: 0,
          clientId: "$_id",
          picture: { $ifNull: ["$client.picture", ""] },
          clientName: "$client.fullName",
          last: { $ifNull: ["$serviceType", ""] },
        },
      },
    ]),
  ]);

  return {
    totalClients,
    totalRecentVisits,
    recentlyViewed: recentVisits,
  };
};

const searchClientByName = async (userId: string, name: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Search name cannot be empty");
  }

  const escaped = escapeRegex(trimmed);

  const clients = await Client.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        fullName: { $regex: escaped, $options: "i" },
      },
    },
    {
      $addFields: {
        score: {
          $switch: {
            branches: [
              // Exact match (case-insensitive)
              {
                case: {
                  $regexMatch: {
                    input: "$fullName",
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
                    input: "$fullName",
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
    { $sort: { score: -1, fullName: 1 } },
    { $limit: 50 },
    {
      $project: {
        _id: 1,
        fullName: 1,
        phoneNumber: 1,
        email: 1,
        picture: 1,
        notes: 1,
        createdAt: 1,
      },
    },
  ]);

  return clients;
};

export const clientService = {
  createClient,
  getClients,
  updateClient,
  deleteClient,
  getHomePageData,
  searchClientByName,
};
