import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/apiResponse";

export abstract class BaseController {
  protected async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction,
    action: () => Promise<any>,
    statusCode: number = 200,
  ): Promise<void> {
    try {
      const result = await action();
      ApiResponse.success(res, result, "Success", statusCode);
    } catch (error) {
      next(error);
    }
  }
}
