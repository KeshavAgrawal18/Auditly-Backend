import { PrismaClient } from "@prisma/client";
import { singleton } from "@/decorators/singleton";
import { logger } from "@/config/logger";
import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";

const prisma = new PrismaClient();

export interface AuditLogInput {
  userId?: string;
  companyId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

@singleton
export class AuditService {
  /**
   * Create a business audit log
   */
  async createLog(input: AuditLogInput): Promise<void> {
    try {
      const { userId, companyId, action, entity, entityId, metadata } = input;

      if (!action) {
        throw new AppError(
          "Audit action is required",
          400,
          ErrorCode.VALIDATION_ERROR,
        );
      }

      await prisma.auditLog.create({
        data: {
          userId,
          companyId,
          action,
          entity,
          entityId,
          metadata: metadata ?? {},
        },
      });

      logger.debug("Audit log created", {
        action,
        userId,
        companyId,
        entity,
        entityId,
      });
    } catch (error) {
      logger.error("Failed to create audit log", {
        error,
        input,
      });

      // If there was an error in creating the log, throw an AppError to properly handle it
      throw new AppError(
        "Failed to create audit log",
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Helper for auth-related events
   */
  async logAuthEvent(
    action: string,
    userId?: string,
    companyId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.createLog({
        action,
        userId,
        companyId,
        entity: "auth",
        metadata,
      });
    } catch (error) {
      // Handle specific errors for auth-related logs
      throw new AppError(
        "Error logging auth event",
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Helper for user-related events
   */
  async logUserEvent(
    action: string,
    userId: string,
    companyId: string,
    targetUserId?: string,
  ): Promise<void> {
    try {
      await this.createLog({
        action,
        userId,
        companyId,
        entity: "user",
        entityId: targetUserId,
      });
    } catch (error) {
      // Handle specific errors for user-related logs
      throw new AppError(
        "Error logging user event",
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
