import { Router } from "express";
import { login, me } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/roleGuard.middleware";

const router = Router();

router.post("/login", login);
router.get("/me", authMiddleware, me);

// Temporary smoke-test route for roleGuard - Task 4+ adds real role-restricted
// endpoints (customers, products, challans); this can be deleted once those exist.
router.get("/admin-only", authMiddleware, roleGuard(["ADMIN"]), (req, res) => {
  res.json({ message: `Welcome, ${req.user!.role}` });
});

export default router;
