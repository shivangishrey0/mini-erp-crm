import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";
import { list, getById, create, updateStatus } from "../controllers/workOrder.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.get("/:id", getById);

// Per the brief: only Admin creates a Work Order. Advancing status
// (ASSIGNED -> IN_PROGRESS -> COMPLETED) is an Operations function too.
router.post("/", roleGuard(["ADMIN"]), create);
router.patch("/:id/status", roleGuard(["ADMIN", "OPERATIONS"]), updateStatus);

export default router;
