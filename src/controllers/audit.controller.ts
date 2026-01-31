import { Request, Response } from "express";
import { AuditService } from "@/services/audit.service";

export class AuditController {
  private auditService = new AuditService();

  async getAuditLogs(req: Request, res: Response) {
    const { action, userId, from, to } = req.query;

    const companyId = req.user.companyId;

    const logs = await this.auditService.getLogs({
      companyId,
      action: action as string,
      userId: userId as string,
      from: from as string,
      to: to as string,
    });

    res.json(logs);
  }
}
