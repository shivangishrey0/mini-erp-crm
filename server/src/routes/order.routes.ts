import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";
import { list, getById, create, fulfill, cancel } from "../controllers/order.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.get("/:id", getById);

router.post("/", roleGuard(["ADMIN", "SALES"]), create);
router.post("/:id/fulfill", roleGuard(["ADMIN", "SALES"]), fulfill);
router.post("/:id/cancel", roleGuard(["ADMIN", "SALES"]), cancel);

export default router;
