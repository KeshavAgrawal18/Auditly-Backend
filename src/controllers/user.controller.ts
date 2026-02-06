import { Request, Response, NextFunction } from "express";
import { UserService } from "@/services/user.service";
import { BaseController } from "./base.controller";
import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";

export class UserController extends BaseController {
  constructor(private userService: UserService) {
    super();
  }

  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user || req.user.role === "USER") {
        throw new AppError("Not authorized", 403);
      }

      return this.userService.getAllUsers(req.user.companyId);
    });
  };

  getUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const isSelf = req.user.userId === req.params.id;
      const isAdmin = req.user.role === "ADMIN" || req.user.role === "OWNER";

      if (!isSelf && !isAdmin) {
        throw new AppError("Not authorized to access this profile", 403);
      }

      return this.userService.getUserById(req.user.companyId, req.params.id);
    });
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    await this.handleRequest(
      req,
      res,
      next,
      async () => {
        if (!req.user || req.user.role === "USER") {
          throw new AppError("Not authorized to create users", 403);
        }

        return this.userService.createUser({
          ...req.body,
          companyId: req.user.companyId, // enforced
        });
      },
      201,
    );
  };

  update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const isSelf = req.user.userId === req.params.id;
      const isAdmin = req.user.role === "ADMIN" || req.user.role === "OWNER";

      if (!isSelf && !isAdmin) {
        throw new AppError("Not authorized to update this user", 403);
      }

      return this.userService.updateUser(
        req.user.companyId,
        req.params.id,
        req.body,
      );
    });
  };

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    await this.handleRequest(
      req,
      res,
      next,
      async () => {
        if (!req.user || req.user.role !== "OWNER") {
          throw new AppError(
            "Only owners can delete users",
            403,
            ErrorCode.FORBIDDEN,
          );
        }

        await this.userService.deleteUser(req.user.companyId, req.params.id);

        return null;
      },
      204,
    );
  };
}
