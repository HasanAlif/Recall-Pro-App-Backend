import express from "express";
import auth from "../../middlewares/auth";
import { clientVisitController } from "./clientVisit.controller";
import { fileUploader } from "../../../helpars/fileUploader";
import { UserRole } from "../../models";

const router = express.Router();

const uploadPhotosAndVideos = fileUploader.uploadVisitFiles;

router.post(
  "/",
  auth(UserRole.USER),
  uploadPhotosAndVideos,
  clientVisitController.create,
);

router.get(
  "/all-visits",
  auth(UserRole.USER),
  clientVisitController.getAllVisits,
);

router.get(
  "/service-types",
  auth(UserRole.USER),
  clientVisitController.getServiceTypes,
);

router.get("/search", auth(UserRole.USER), clientVisitController.searchVisits);

router.get("/", auth(UserRole.USER), clientVisitController.getAll);

router.get("/:id", auth(UserRole.USER), clientVisitController.getById);

export const clientVisitRoutes = router;
