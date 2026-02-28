import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { userRoutes } from "../modules/user/user.route";
import { clientRoutes } from "../modules/client/client.routes";
import { clientVisitRoutes } from "../modules/clientVisit/clientVisit.routes";
import { analyticsRoutes } from "../modules/analytics/analytics.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/clients",
    route: clientRoutes,
  },
  {
    path: "/client-visits",
    route: clientVisitRoutes,
  },
  {
    path: "/analytics",
    route: analyticsRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
