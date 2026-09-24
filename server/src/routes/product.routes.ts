import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";
import { list, getById, create, update } from "../controllers/product.controller";

const router = Router();

// Catalog only now (name/sku/category/price/alert threshold) - stock lives
// under /inventory. Writes restricted to ADMIN + OPERATIONS.
router.use(authMiddleware);

router.get("/", list);
router.get("/:id", getById);

router.post("/", roleGuard(["ADMIN", "OPERATIONS"]), create);
router.patch("/:id", roleGuard(["ADMIN", "OPERATIONS"]), update);

export default router;
