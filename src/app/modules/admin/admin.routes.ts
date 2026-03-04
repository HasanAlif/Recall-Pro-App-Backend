import express from "express";
import auth from "../../middlewares/auth";
import { adminController } from "./admin.controller";
import { UserRole } from "../../models";

const router = express.Router();

router.get(
  "/dashboard-overview",
  auth(UserRole.ADMIN),
  adminController.dashboardOverviewData,
);

export const adminRoutes = router;
