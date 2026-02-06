import { PrismaClient } from "@prisma/client";
import { AppError } from "@/utils/appError";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { EmailService } from "./email.service";
import { UserRole } from "@/middleware/authMiddleware";
import { ErrorCode } from "@/utils/errorCodes";

const prisma = new PrismaClient();

export class UserService {
  private emailService = new EmailService();

  async getAllUsers(companyId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    return prisma.user.findMany({
      where: { companyId },
      take: limit,
      skip,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getUserById(companyId: string, id: string) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async updateUser(
    companyId: string,
    id: string,
    data: Partial<{
      name: string;
      email: string;
      role: "ADMIN" | "USER";
    }>,
  ) {
    return prisma.user.update({
      where: {
        id,
        companyId,
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
      },
    });
  }

  async deleteUser(companyId: string, id: string) {
    const result = await prisma.user.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (result.count === 0) {
      throw new AppError("User not found", 404);
    }
  }

  async createUser(params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    companyId: string;
  }) {
    const { name, email, password, role, companyId } = params;

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (exists) {
      throw new AppError("Email already exists", 409, ErrorCode.ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        companyId,
        emailVerified: null,
        emailVerificationToken: verifyToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
      },
    });

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name,
      verifyToken,
    );

    return user;
  }
}
