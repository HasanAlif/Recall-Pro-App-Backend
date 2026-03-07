import mongoose, { Document, Schema, Types } from "mongoose";

export interface IClientVisit extends Document {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  serviceType?: string;
  photos?: string[];
  videos?: string[];
  signedVideos?: string[];
  videoUrlsExpiry?: Date;
  serviceNotes?: string;
  personalNotes?: string;
  duration?: number;
  date?: Date;
  servicePrice?: number;
  tips?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ClientVisitSchema = new Schema<IClientVisit>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      trim: true,
    },
    photos: {
      type: [String],
      default: [],
    },
    videos: {
      type: [String],
      default: [],
    },
    signedVideos: {
      type: [String],
      default: [],
    },
    videoUrlsExpiry: {
      type: Date,
    },
    serviceNotes: {
      type: String,
      trim: true,
    },
    personalNotes: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number,
    },
    date: {
      type: Date,
    },
    servicePrice: {
      type: Number,
    },
    tips: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

// Index for better performance
ClientVisitSchema.index({ serviceType: 1 });

export const ClientVisit = mongoose.model<IClientVisit>(
  "ClientVisit",
  ClientVisitSchema,
);
