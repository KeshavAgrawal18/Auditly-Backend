import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ENV } from "@/config/env";
import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";
import crypto from "crypto";
import { EmailService } from "./email.service";

const prisma = new PrismaClient();

export class AuthService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // =====================
  // Helpers
  // =====================

  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private generateAccessToken(user: any): string {
    return jwt.sign(
      {
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
      },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRY },
    );
  }

  private generateRefreshToken(user: any): string {
    return jwt.sign(
      {
        userId: user.id,
        companyId: user.companyId,
      },
      ENV.REFRESH_TOKEN_SECRET,
      { expiresIn: ENV.REFRESH_TOKEN_EXPIRY },
    );
  }

  // =====================
  // Register Company + Owner
  // =====================

  async register(
    companyName: string,
    email: string,
    name: string,
    password: string,
  ) {
    const exists = await prisma.user.findUnique({ where: { email } });

    if (exists) {
      throw new AppError("Email already exists", 409, ErrorCode.ALREADY_EXISTS);
    }

    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = this.generateToken();

    const company = await prisma.company.create({
      data: { name: companyName },
    });

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashed,
        role: "OWNER",
        companyId: company.id,
        emailVerificationToken: verifyToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.emailService.sendVerificationEmail(email, name, verifyToken);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  // =====================
  // Login
  // =====================

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      throw new AppError(
        "Invalid credentials",
        401,
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    if (!user.emailVerified) {
      throw new AppError(
        "Verify your email first",
        401,
        ErrorCode.UNAUTHORIZED,
      );
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new AppError(
        "Invalid credentials",
        401,
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return { user, accessToken, refreshToken };
  }

  // =====================
  // Refresh
  // =====================

  async refresh(refreshToken: string) {
    const payload = jwt.verify(refreshToken, ENV.REFRESH_TOKEN_SECRET) as any;

    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        refreshToken,
      },
    });

    if (!user) {
      throw new AppError("Invalid refresh token", 401, ErrorCode.INVALID_TOKEN);
    }

    const accessToken = this.generateAccessToken(user);

    return { accessToken };
  }

  // =====================
  // Logout
  // =====================

  async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  // =====================
  // Email Verification
  // =====================

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError("Invalid token", 400, ErrorCode.INVALID_TOKEN);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  }

  // =====================
  // Forgot / Reset Password
  // =====================

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return;

    const token = this.generateToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 3600000),
      },
    });

    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      token,
    );
  }

  async resetPassword(token: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError("Invalid token", 400, ErrorCode.INVALID_TOKEN);
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: "Password reset successfully" };
  }
}
