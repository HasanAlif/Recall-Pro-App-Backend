import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import streamifier from "streamifier";
import { Storage } from "@google-cloud/storage";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Configure Google Cloud Storage
const gcsStorage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: path.join(
    process.cwd(),
    process.env.GCS_KEY_FILE || "google-cloud-key.json",
  ),
});
const gcsBucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME || "");

const generateGCSSignedUrl = async (
  filePathOrUrl: string,
  expiresInMinutes: number = 10080, // 7 days
): Promise<string> => {
  const bucketName = process.env.GCS_BUCKET_NAME || "";
  const prefix = `https://storage.googleapis.com/${bucketName}/`;
  const filePath = filePathOrUrl.startsWith(prefix)
    ? filePathOrUrl.slice(prefix.length)
    : filePathOrUrl;

  const [signedUrl] = await gcsBucket.file(filePath).getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
    version: "v4",
  });
  return signedUrl;
};

// Configure DigitalOcean Spaces
const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.DO_SPACE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACE_ACCESS_KEY || "",
    secretAccessKey: process.env.DO_SPACE_SECRET_KEY || "",
  },
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer configuration using memoryStorage (for DigitalOcean & Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.size > 10 * 1024 * 1024) {
      cb(new Error("Image file is too Large. Maximum file size 10 MB"));
    } else {
      cb(null, true);
    }
  },
});

// ✅ Fixed Cloudinary Storage
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    public_id: (req, file) => `${Date.now()}_${file.originalname}`,
  },
});

const cloudinaryUpload = multer({ storage: cloudinaryStorage });

// Upload single image
const uploadSingle = upload.single("image");
const uploadFile = upload.single("file");

// Upload multiple images
const uploadMultipleImage = upload.fields([{ name: "images", maxCount: 15 }]);
const uploadMultipleFiles = upload.fields([{ name: "files", maxCount: 15 }]);

// Upload profile and banner images
const userMutipleFiles = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "image", maxCount: 1 },
]);

// ✅ Enhanced Cloudinary Upload with better file handling
const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = "uploads",
): Promise<{ Location: string; public_id: string }> => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  return new Promise((resolve, reject) => {
    // Generate unique filename
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(2)}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto", // Supports images, videos, etc.
        public_id: uniqueFilename.split(".")[0], // Remove extension for public_id
        unique_filename: true,
        overwrite: false,
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Error uploading file to Cloudinary:", error);
          return reject(error);
        }

        // ✅ Explicitly return `Location` and `public_id`
        resolve({
          Location: result?.secure_url || "", // Cloudinary URL
          public_id: result?.public_id || "",
        });
      },
    );

    // Convert buffer to stream and upload
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

// ✅ Unchanged: DigitalOcean Upload
const uploadToDigitalOcean = async (file: Express.Multer.File) => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  try {
    const Key = `nathancloud/${Date.now()}_${uuidv4()}_${file.originalname}`;
    const uploadParams = {
      Bucket: process.env.DO_SPACE_BUCKET || "",
      Key,
      Body: file.buffer, // ✅ Use buffer instead of file path
      ACL: "public-read" as ObjectCannedACL,
      ContentType: file.mimetype,
    };

    // Upload file to DigitalOcean Spaces
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Format the URL
    const fileURL = `${process.env.DO_SPACE_ENDPOINT}/${process.env.DO_SPACE_BUCKET}/${Key}`;
    return {
      Location: fileURL,
      Bucket: process.env.DO_SPACE_BUCKET || "",
      Key,
    };
  } catch (error) {
    console.error("Error uploading file to DigitalOcean:", error);
    throw error;
  }
};

// Upload profile image specifically
const uploadProfileImage = async (file: Express.Multer.File) => {
  return uploadToCloudinary(file, "profile-images");
};

// Upload general file
const uploadGeneralFile = async (file: Express.Multer.File) => {
  return uploadToCloudinary(file, "user-files");
};

// ✅ Upload video to Google Cloud Storage
const uploadVideoToGCS = async (
  file: Express.Multer.File,
  folder: string = "videos",
): Promise<{ Location: string; fileName: string }> => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  const allowedMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(
      `Invalid video format: ${file.mimetype}. Allowed: mp4, mpeg, mov, avi, webm, mkv`,
    );
  }

  const uniqueFileName = `${folder}/${Date.now()}_${uuidv4()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const blob = gcsBucket.file(uniqueFileName);

  return new Promise((resolve, reject) => {
    const blobStream = blob.createWriteStream({
      resumable: true,
      contentType: file.mimetype,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    blobStream.on("error", (error) => {
      console.error("Error uploading video to GCS:", error);
      reject(error);
    });

    blobStream.on("finish", () => {
      const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${uniqueFileName}`;
      resolve({
        Location: publicUrl,
        fileName: uniqueFileName,
      });
    });

    blobStream.end(file.buffer);
  });
};

// ✅ Upload any file to Google Cloud Storage (images, docs, etc.)
const uploadToGCS = async (
  file: Express.Multer.File,
  folder: string = "uploads",
): Promise<{ Location: string; fileName: string }> => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  const uniqueFileName = `${folder}/${Date.now()}_${uuidv4()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const blob = gcsBucket.file(uniqueFileName);

  return new Promise((resolve, reject) => {
    const blobStream = blob.createWriteStream({
      resumable: true,
      contentType: file.mimetype,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    blobStream.on("error", (error) => {
      console.error("Error uploading file to GCS:", error);
      reject(error);
    });

    blobStream.on("finish", () => {
      const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${uniqueFileName}`;
      resolve({
        Location: publicUrl,
        fileName: uniqueFileName,
      });
    });

    blobStream.end(file.buffer);
  });
};

// Multer middleware for video uploads (max 100MB)
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
      "video/x-matroska",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid video format: ${file.mimetype}`));
    }
  },
}).single("video");

// Multer middleware for multiple video uploads
const uploadMultipleVideos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
      "video/x-matroska",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid video format: ${file.mimetype}`));
    }
  },
}).fields([{ name: "videos", maxCount: 5 }]);

// Multer for visit uploads: photos (≤10 MB each handled downstream) + videos (≤200 MB)
const uploadVisitFiles = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB — accommodates videos
}).fields([
  { name: "photos", maxCount: 15 },
  { name: "videos", maxCount: 5 },
]);

// Delete a single file from Cloudinary by its URL (fire-and-forget)
const deleteFromCloudinary = (url: string | undefined): void => {
  if (!url) return;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  const publicId = match ? match[1] : null;
  if (publicId) {
    cloudinary.uploader.destroy(publicId).catch(() => {});
  }
};

// Delete a single file from Google Cloud Storage by its URL (fire-and-forget)
const deleteFromGCS = (url: string | undefined): void => {
  if (!url) return;
  const bucketName = process.env.GCS_BUCKET_NAME || "";
  const prefix = `https://storage.googleapis.com/${bucketName}/`;
  if (!url.startsWith(prefix)) return;
  const filePath = url.slice(prefix.length);
  gcsBucket
    .file(filePath)
    .delete()
    .catch(() => {});
};

export const fileUploader = {
  upload,
  uploadSingle,
  uploadMultipleFiles,
  uploadMultipleImage,
  userMutipleFiles,
  uploadFile,
  cloudinaryUpload,
  uploadToDigitalOcean,
  uploadToCloudinary,
  uploadProfileImage,
  uploadGeneralFile,
  uploadVideoToGCS,
  uploadToGCS,
  uploadVideo,
  uploadMultipleVideos,
  uploadVisitFiles,
  generateGCSSignedUrl,
  deleteFromCloudinary,
  deleteFromGCS,
};
