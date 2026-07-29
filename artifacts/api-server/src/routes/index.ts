import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import rolesRouter from "./roles";
import organizationsRouter from "./organizations";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/roles", rolesRouter);
router.use("/organizations", organizationsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
