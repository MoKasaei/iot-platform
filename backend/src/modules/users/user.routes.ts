import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { createUser, deleteUser, listUsers, updateUser } from "./user.controller";

const router = Router();
router.use(requireAuth, requireRole("admin"));
router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:userId", updateUser);
router.delete("/:userId", deleteUser);

export default router;
