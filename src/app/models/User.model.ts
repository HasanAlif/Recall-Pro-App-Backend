import mongoose, { Document, Schema } from "mongoose";

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BLOCKED = "BLOCKED",
}

export enum AuthProvider {
  LOCAL = "LOCAL",
  GOOGLE = "GOOGLE",
}

export enum PremiumPlan {
  TRIAL = "TRIAL",
  TRIAL_EXPIRED = "TRIAL_EXPIRED",
  BASIC_MONTHLY = "BASIC_MONTHLY",
  BASIC_ANNUAL = "BASIC_ANNUAL",
  PREMIUM_MONTHLY = "PREMIUM_MONTHLY",
  PREMIUM_ANNUAL = "PREMIUM_ANNUAL",
  EXPIRED = "EXPIRED",
}

export interface IUser extends Document {
  _id: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  password?: string;
  profilePicture?: string;
  location?: string;
  role: UserRole;
  status: UserStatus;
  premiumPlan?: PremiumPlan;
  premiumPlanExpiry?: Date | null;
  // premiumPlanHistory: {
  //   plan: PremiumPlan;
  //   purchasedAt: Date;
  // }[];
  isEnjoyedTrial: boolean;
  isDeleted: boolean;
  resetPasswordOtp?: string;
  resetPasswordOtpExpiry?: Date;
  isVerified: boolean;
  verificationOtp?: string;
  verificationOtpExpiry?: Date;
  googleId?: string;
  authProvider?: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
    },
    location: {
      type: String,
      required: false,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    profilePicture: {
      type: String,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    premiumPlan: {
      type: String,
      enum: Object.values(PremiumPlan),
      default: null,
    },
    premiumPlanExpiry: {
      type: Date,
      default: null,
    },
    // premiumPlanHistory: {
    //   type: [
    //     {
    //       plan: {
    //         type: String,
    //         enum: Object.values(PremiumPlan),
    //         required: true,
    //       },
    //       purchasedAt: {
    //         type: Date,
    //         required: true,
    //         default: Date.now,
    //       },
    //     },
    //   ],
    //   default: [],
    // },
    isEnjoyedTrial: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    resetPasswordOtp: {
      type: String,
      select: false,
    },
    resetPasswordOtpExpiry: {
      type: Date,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationOtp: {
      type: String,
      select: false,
    },
    verificationOtpExpiry: {
      type: Date,
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.LOCAL,
    },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model<IUser>("User", UserSchema);
