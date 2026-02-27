import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { userRoutes } from "../modules/user/user.route";
import { clientRoutes } from "../modules/client/client.routes";
import { clientVisitRoutes } from "../modules/clientVisit/clientVisit.routes";

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
