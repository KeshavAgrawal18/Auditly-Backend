import { testApp } from "../setup.e2e";
import prisma from "@/config/database";

describe("Audit endpoints (e2e)", () => {
  let userToken: string;
  let companyId: string;

  beforeEach(async () => {
    // Clean up any existing data
    await prisma.$transaction([
      prisma.user.deleteMany(),
      prisma.company.deleteMany(),
      prisma.auditLog.deleteMany(),
    ]);

    // Register a user and log them in to get the token for authorization
    const userResponse = await testApp.post("/api/auth/register").send({
      email: "audit@example.com",
      name: "Audit User",
      password: "Password123!",
      companyName: "Audit Corp",
    });

    // Verify email
    await prisma.user.update({
      where: { email: "audit@example.com" },
      data: { emailVerified: new Date() },
    });

    const loginResponse = await testApp.post("/api/auth/login").send({
      email: "audit@example.com",
      password: "Password123!",
    });

    userToken = loginResponse.body.data.accessToken;
    companyId = userResponse.body.data.user.companyId;
  });

  describe("GET /api/audit", () => {
    beforeEach(async () => {
      // Create some audit logs for the user
      await prisma.auditLog.createMany({
        data: [
          {
            userId: "user-001",
            companyId,
            action: "USER_LOGIN",
            entity: "user",
            entityId: "user-001",
            metadata: { ip: "127.0.0.1", browser: "Chrome" },
            createdAt: new Date(),
          },
          {
            userId: "user-001",
            companyId,
            action: "USER_LOGOUT",
            entity: "user",
            entityId: "user-001",
            metadata: { ip: "127.0.0.2", browser: "Firefox" },
            createdAt: new Date(),
          },
        ],
      });
    });

    it("should retrieve audit logs with valid authorization", async () => {
      const response = await testApp
        .get("/api/audit")
        .set("Authorization", `Bearer ${userToken}`)
        .query({ from: "2026-01-01", to: "2026-12-31", action: "USER_LOGIN" })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].action).toBe("USER_LOGIN");
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("userId");
      expect(response.body[0]).toHaveProperty("companyId");
    });

    it("should return 401 for unauthorized access", async () => {
      const response = await testApp.get("/api/audit").expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Unauthorized - Invalid or expired token",
      );
    });

    it("should handle invalid filters gracefully", async () => {
      const response = await testApp
        .get("/api/audit")
        .set("Authorization", `Bearer ${userToken}`)
        .query({ action: "INVALID_ACTION" })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0); // No logs should be returned
    });
  });
});
