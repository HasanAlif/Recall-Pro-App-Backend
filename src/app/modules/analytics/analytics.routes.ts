import express from "express";
import auth from "../../middlewares/auth";
import { analyticsController } from "./analytics.controller";
import { UserRole } from "../../models";

const router = express.Router();

router.get("/", auth(), analyticsController.getAnalytics);

router.get(
  "/revenue-breakdown",
  auth(UserRole.USER),
  analyticsController.getRevenueBreakDown,
);

export const analyticsRoutes = router;
