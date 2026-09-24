import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";
import { list, getById, create, dispatch, receive } from "../controllers/transfer.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.get("/:id", getById);

router.post("/", roleGuard(["ADMIN", "OPERATIONS"]), create);
router.post("/:id/dispatch", roleGuard(["ADMIN", "OPERATIONS"]), dispatch);
router.post("/:id/receive", roleGuard(["ADMIN", "OPERATIONS"]), receive);

export default router;
