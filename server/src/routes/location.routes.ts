import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";
import { list, create } from "../controllers/location.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.post("/", roleGuard(["ADMIN"]), create);

export default router;
