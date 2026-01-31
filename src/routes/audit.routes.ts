import { Router } from "express";
import { AuditController } from "@/controllers/audit.controller";
import { requireAuth } from "@/middleware/authMiddleware";

const router = Router();
const controller = new AuditController();

router.get("/", requireAuth, controller.getAuditLogs.bind(controller));

export default router;
