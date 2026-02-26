import express from "express";
import auth from "../../middlewares/auth";
import { clientController } from "./client.controller";
import { fileUploader } from "../../../helpars/fileUploader";

const router = express.Router();

const uploadPicture = fileUploader.upload.single("picture");

router.post("/", auth(), uploadPicture, clientController.create);

router.get("/", auth(), clientController.getAll);

router.get("/:id", auth(), clientController.getById);

router.patch("/:id", auth(), uploadPicture, clientController.update);

router.delete("/:id", auth(), clientController.remove);

export const clientRoutes = router;
