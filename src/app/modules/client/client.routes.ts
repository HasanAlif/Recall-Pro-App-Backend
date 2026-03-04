import express from "express";
import auth from "../../middlewares/auth";
import { clientController } from "./client.controller";
import { fileUploader } from "../../../helpars/fileUploader";
import { UserRole } from "../../models";

const router = express.Router();

const uploadPicture = fileUploader.upload.single("picture");

router.post("/", auth(UserRole.USER), uploadPicture, clientController.create);

router.get("/", auth(UserRole.USER), clientController.getAll);

router.get("/home", auth(UserRole.USER), clientController.getHomePageData);

router.patch(
  "/:id",
  auth(UserRole.USER),
  uploadPicture,
  clientController.update,
);

router.delete("/:id", auth(UserRole.USER), clientController.remove);

export const clientRoutes = router;
