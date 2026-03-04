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

router.get(
  "/monthly-user-growth",
  auth(UserRole.ADMIN),
  adminController.getMonthlyUserGrowth,
);

router.get(
  "/monthly-premium-users-growth",
  auth(UserRole.ADMIN),
  adminController.getMonthlyPremiumUsersGrowth,
);

export const adminRoutes = router;
