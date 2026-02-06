import { testApp } from "../setup.e2e";
import prisma from "@/config/database";

describe("Auth endpoints (e2e)", () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.$transaction([
      prisma.user.deleteMany(),
      prisma.company.deleteMany(),
    ]);
  });

  describe("POST /api/auth/register", () => {
    it("should register company and owner", async () => {
      const response = await testApp.post("/api/auth/register").send({
        email: "test@example.com",
        name: "Test User",
        password: "Password123!",
        companyName: "Test Company",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty("id");
      expect(response.body.data.user.companyId).toBeTruthy();
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await testApp.post("/api/auth/register").send({
        email: "test@example.com",
        name: "Test User",
        password: "Password123!",
        companyName: "Test Company",
      });

      // mark email as verified (same as prod flow)
      await prisma.user.update({
        where: { email: "test@example.com" },
        data: { emailVerified: new Date() },
      });
    });

    it("should login successfully", async () => {
      const response = await testApp.post("/api/auth/login").send({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
    });
  });

  describe("Email verification", () => {
    it("should verify email with valid token", async () => {
      await testApp.post("/api/auth/register").send({
        email: "verify@example.com",
        name: "Verify User",
        password: "Password123!",
        companyName: "Verify Corp",
      });

      const user = await prisma.user.findUnique({
        where: { email: "verify@example.com" },
      });

      expect(user?.emailVerificationToken).toBeTruthy();

      const response = await testApp
        .get(`/api/auth/verify-email/${user!.emailVerificationToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const verifiedUser = await prisma.user.findUnique({
        where: { id: user!.id },
      });

      expect(verifiedUser?.emailVerified).toBeTruthy();
    });
  });

  describe("Password reset", () => {
    beforeEach(async () => {
      await testApp.post("/api/auth/register").send({
        email: "reset@example.com",
        name: "Reset User",
        password: "Password123!",
        companyName: "Reset Corp",
      });

      await prisma.user.update({
        where: { email: "reset@example.com" },
        data: { emailVerified: new Date() },
      });
    });

    it("should send password reset email", async () => {
      const response = await testApp
        .post("/api/auth/forgot-password")
        .send({ email: "reset@example.com" })
        .expect(200);

      expect(response.body.success).toBe(true);

      const user = await prisma.user.findUnique({
        where: { email: "reset@example.com" },
      });

      expect(user?.passwordResetToken).toBeTruthy();
      expect(user?.passwordResetExpires).toBeTruthy();
    });

    it("should reset password with valid token", async () => {
      await testApp
        .post("/api/auth/forgot-password")
        .send({ email: "reset@example.com" });

      const user = await prisma.user.findUnique({
        where: { email: "reset@example.com" },
      });

      const response = await testApp
        .post(`/api/auth/reset-password/${user!.passwordResetToken}`)
        .send({ password: "NewPassword123!" })
        .expect(200);

      expect(response.body.success).toBe(true);

      const loginResponse = await testApp.post("/api/auth/login").send({
        email: "reset@example.com",
        password: "NewPassword123!",
      });

      expect(loginResponse.body.data.accessToken).toBeTruthy();
    });

    it("should fail with expired reset token", async () => {
      await prisma.user.update({
        where: { email: "reset@example.com" },
        data: {
          passwordResetToken: "expired-token",
          passwordResetExpires: new Date(Date.now() - 3600000),
        },
      });

      const response = await testApp
        .post("/api/auth/reset-password/expired-token")
        .send({ password: "NewPassword123!" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
