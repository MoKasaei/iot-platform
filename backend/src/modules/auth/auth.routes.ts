import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { login, me } from "./auth.controller";

const router = Router();

router.post("/login", login);
router.get("/me", requireAuth, me);

export default router;
