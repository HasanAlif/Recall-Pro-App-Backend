import express from "express";
import auth from "../../middlewares/auth";
import { clientVisitController } from "./clientVisit.controller";
import { fileUploader } from "../../../helpars/fileUploader";

const router = express.Router();

const uploadPhotosAndVideos = fileUploader.upload.fields([
  { name: "photos", maxCount: 15 },
  { name: "videos", maxCount: 5 },
]);

router.post("/", auth(), uploadPhotosAndVideos, clientVisitController.create);

router.get("/", auth(), clientVisitController.getAll);

router.get("/:id", auth(), clientVisitController.getById);

export const clientVisitRoutes = router;
