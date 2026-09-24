import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { list } from "../controllers/user.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", list);

export default router;
