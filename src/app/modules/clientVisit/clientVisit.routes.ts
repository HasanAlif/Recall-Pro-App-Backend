import express from "express";
import auth from "../../middlewares/auth";
import { clientVisitController } from "./clientVisit.controller";
import { fileUploader } from "../../../helpars/fileUploader";

const router = express.Router();

const uploadPhotos = fileUploader.upload.array("photos", 15);

router.post("/", auth(), uploadPhotos, clientVisitController.create);

router.get("/", auth(), clientVisitController.getAll);

router.get("/:id", auth(), clientVisitController.getById);

export const clientVisitRoutes = router;
