import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";
import { list, getById, create, update, adjustStock, listMovements } from "../controllers/product.controller";

const router = Router();

// Every product route requires a valid login. Writes (catalog + stock
// changes) are restricted to ADMIN + WAREHOUSE - inventory is a warehouse
// function, but SALES/ACCOUNTS still need to read stock levels.
router.use(authMiddleware);

router.get("/", list);
router.get("/:id", getById);
router.get("/:id/movements", listMovements);

router.post("/", roleGuard(["ADMIN", "WAREHOUSE"]), create);
router.patch("/:id", roleGuard(["ADMIN", "WAREHOUSE"]), update);
router.post("/:id/stock-movements", roleGuard(["ADMIN", "WAREHOUSE"]), adjustStock);

export default router;
