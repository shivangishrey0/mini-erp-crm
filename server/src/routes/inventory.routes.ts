import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";
import { list, getById, adjust, listMovements } from "../controllers/inventory.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.get("/:id", getById);
router.get("/:id/movements", listMovements);

router.post("/adjust", roleGuard(["ADMIN", "OPERATIONS"]), adjust);

export default router;
