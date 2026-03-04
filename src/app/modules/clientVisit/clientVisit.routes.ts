import express from "express";
import auth from "../../middlewares/auth";
import { clientVisitController } from "./clientVisit.controller";
import { fileUploader } from "../../../helpars/fileUploader";
import { UserRole } from "../../models";

const router = express.Router();

const uploadPhotosAndVideos = fileUploader.upload.fields([
  { name: "photos", maxCount: 15 },
  { name: "videos", maxCount: 5 },
]);

router.post(
  "/",
  auth(UserRole.USER),
  uploadPhotosAndVideos,
  clientVisitController.create,
);

router.get("/", auth(UserRole.USER), clientVisitController.getAll);

router.get("/:id", auth(UserRole.USER), clientVisitController.getById);

export const clientVisitRoutes = router;
