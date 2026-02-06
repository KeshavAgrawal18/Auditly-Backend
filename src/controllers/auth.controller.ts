import { Request, Response, NextFunction } from "express";
import { AuthService } from "@/services/auth.service";
import { BaseController } from "./base.controller";
import { AppError } from "@/utils/appError";

export class AuthController extends BaseController {
  constructor(private authService: AuthService) {
    super();
  }

  // Register company + owner
  register = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(
      req,
      res,
      next,
      async () => {
        const { companyName, email, name, password } = req.body;
        return this.authService.register(companyName, email, name, password);
      },
      201,
    );
  };

  // Login
  login = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { email, password } = req.body;
      return this.authService.login(email, password);
    });
  };

  // Refresh access token
  refresh = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { refreshToken } = req.body;
      return this.authService.refresh(refreshToken);
    });
  };

  // Current user
  me = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      if (!req.user) throw new AppError("Unauthorized", 401);
      return req.user;
    });
  };

  // Logout
  logout = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId) {
        throw new AppError("Unauthorized", 401);
      }

      await this.authService.logout(req.user.userId);
      return { message: "Logged out successfully" };
    });
  };

  // Verify email
  verifyEmail = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { token } = req.params;
      await this.authService.verifyEmail(token);
      return { message: "Email verified" };
    });
  };

  // Forgot password
  forgotPassword = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { email } = req.body;
      await this.authService.forgotPassword(email);
      return { message: "If email exists, reset link sent" };
    });
  };

  // Reset password
  resetPassword = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { token } = req.params;
      const { password } = req.body;
      await this.authService.resetPassword(token, password);
      return { message: "Password reset successful" };
    });
  };
}
