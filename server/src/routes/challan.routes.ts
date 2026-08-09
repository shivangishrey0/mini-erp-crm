import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";
import { list, getById, create, confirm, cancel } from "../controllers/challan.controller";

const router = Router();

// Every challan route requires a valid login. Writes (create/confirm/cancel)
// are restricted to ADMIN + SALES, same pattern as customers - challans are
// a sales action, but WAREHOUSE/ACCOUNTS still need to read them.
router.use(authMiddleware);

router.get("/", list);
router.get("/:id", getById);

router.post("/", roleGuard(["ADMIN", "SALES"]), create);
router.post("/:id/confirm", roleGuard(["ADMIN", "SALES"]), confirm);
router.post("/:id/cancel", roleGuard(["ADMIN", "SALES"]), cancel);

export default router;
