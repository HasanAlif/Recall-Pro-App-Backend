import express from "express";
import auth from "../../middlewares/auth";
import { analyticsController } from "./analytics.controller";

const router = express.Router();

router.get("/", auth(), analyticsController.getAnalytics);

router.get(
  "/revenue-breakdown",
  auth(),
  analyticsController.getRevenueBreakDown,
);

export const analyticsRoutes = router;
