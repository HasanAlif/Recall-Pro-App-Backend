import mongoose, { Document, Schema, Types } from "mongoose";

export interface IClient extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  picture?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    picture: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for better performance
ClientSchema.index({ fullName: 1 });

export const Client = mongoose.model<IClient>("Client", ClientSchema);
