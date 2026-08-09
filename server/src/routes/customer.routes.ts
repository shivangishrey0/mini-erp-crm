import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";
import {
  list,
  getById,
  create,
  update,
  addFollowUpNote,
  listFollowUpNotes,
} from "../controllers/customer.controller";

const router = Router();

// Every customer route requires a valid login. Writes are further
// restricted to ADMIN + SALES - CRM is a sales function; WAREHOUSE/ACCOUNTS
// can still view customers (challan/invoice context) but not edit them.
router.use(authMiddleware);

router.get("/", list);
router.get("/:id", getById);
router.get("/:id/follow-ups", listFollowUpNotes);

router.post("/", roleGuard(["ADMIN", "SALES"]), create);
router.patch("/:id", roleGuard(["ADMIN", "SALES"]), update);
router.post("/:id/follow-ups", roleGuard(["ADMIN", "SALES"]), addFollowUpNote);

export default router;
