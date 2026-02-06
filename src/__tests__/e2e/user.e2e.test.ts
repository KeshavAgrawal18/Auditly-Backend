import { testApp } from "../setup.e2e";
import prisma from "@/config/database";

describe("User endpoints (e2e)", () => {
  beforeEach(async () => {
    // Clean up users and other necessary tables before each test
    await prisma.$transaction([
      prisma.user.deleteMany(),
      prisma.company.deleteMany(),
    ]);
  });

  describe("POST /users", () => {
    it("should create a new user for a company (ADMIN/OWNER)", async () => {
      // Register a company and an owner first
      const registerResponse = await testApp.post("/api/auth/register").send({
        email: "owner@example.com",
        name: "Owner User",
        password: "Password123!",
        companyName: "Test Company",
      });

      // Simulate email verification for the owner
      const owner = await prisma.user.findUnique({
        where: { email: "owner@example.com" },
      });
      await prisma.user.update({
        where: { id: owner?.id },
        data: { emailVerified: new Date() }, // Mark the owner as verified
      });

      // Login as the owner
      const loginResponse = await testApp.post("/api/auth/login").send({
        email: "owner@example.com",
        password: "Password123!",
      });
      const token = loginResponse.body.data.accessToken;

      // Create a new user for the same company
      const response = await testApp
        .post("/api/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "New User",
          email: "newuser@example.com",
          password: "Password123!",
          role: "USER", // Could also test different roles (e.g., 'ADMIN', 'USER')
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.email).toBe("newuser@example.com");
    });
  });

  describe("GET /users", () => {
    it("should get all users in the same company (ADMIN/OWNER)", async () => {
      // Register company and owner
      const registerResponse = await testApp.post("/api/auth/register").send({
        email: "owner@example.com",
        name: "Owner User",
        password: "Password123!",
        companyName: "Test Company",
      });

      const owner = await prisma.user.findUnique({
        where: { email: "owner@example.com" },
      });
      await prisma.user.update({
        where: { id: owner?.id },
        data: { emailVerified: new Date() }, // Mark the owner as verified
      });

      const loginResponse = await testApp.post("/api/auth/login").send({
        email: "owner@example.com",
        password: "Password123!",
      });

      const token = loginResponse.body.data.accessToken;

      // Create another user in the same company
      await testApp
        .post("/api/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "User 1",
          email: "user1@example.com",
          password: "Password123!",
          role: "USER",
        });

      // Get users for the same company (as an authenticated user)
      const response = await testApp
        .get("/api/users")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });
  });

  describe("GET /users/:id", () => {
    it("should return user details for an authenticated user", async () => {
      const registerResponse = await testApp.post("/api/auth/register").send({
        email: "user@example.com",
        name: "User Name",
        password: "Password123!",
        companyName: "Test Company",
      });

      const userId = registerResponse.body.data.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      await prisma.user.update({
        where: { id: user?.id },
        data: { emailVerified: new Date() }, // Simulate email verification
      });

      // Login and get user details
      const loginResponse = await testApp.post("/api/auth/login").send({
        email: "user@example.com",
        password: "Password123!",
      });

      const token = loginResponse.body.data.accessToken;

      const response = await testApp
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveProperty("id", userId);
    });
    it("should return 404 if user not found", async () => {
      const registerResponse = await testApp.post("/api/auth/register").send({
        email: "user@example.com",
        name: "User Name",
        password: "Password123!",
        companyName: "Test Company",
      });

      const userId = registerResponse.body.data.user.id;

      // Simulate email verification
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      await prisma.user.update({
        where: { id: user?.id },
        data: { emailVerified: new Date() }, // Simulate email verification
      });

      // Login and get the user details
      const loginResponse = await testApp.post("/api/auth/login").send({
        email: "user@example.com",
        password: "Password123!",
      });

      const token = loginResponse.body.data.accessToken;

      // Try to fetch a non-existing user (this should return 404)
      const response = await testApp
        .get("/api/users/non-existing-id")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not found");
    });
  });

  describe("PATCH /users/:id", () => {
    it("should update user details (ADMIN/OWNER)", async () => {
      const registerResponse = await testApp.post("/api/auth/register").send({
        email: "user@example.com",
        name: "User Name",
        password: "Password123!",
        companyName: "Test Company",
      });

      const userId = registerResponse.body.data.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      await prisma.user.update({
        where: { id: user?.id },
        data: { emailVerified: new Date() }, // Simulate email verification
      });

      const loginResponse = await testApp.post("/api/auth/login").send({
        email: "user@example.com",
        password: "Password123!",
      });

      const token = loginResponse.body.data.accessToken;

      const updatedUser = {
        name: "Updated Name",
        email: "updated@example.com",
      };

      const response = await testApp
        .patch(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(updatedUser)
        .expect(200);

      expect(response.body.data.name).toBe(updatedUser.name);
      expect(response.body.data.email).toBe(updatedUser.email);
    });
  });

  describe("DELETE /users/:id", () => {
    it("should delete user (OWNER only)", async () => {
      // Register a user (owner) and company
      const registerResponse = await testApp.post("/api/auth/register").send({
        email: "owner@example.com",
        name: "Owner User",
        password: "Password123!",
        companyName: "Test Company",
      });

      const ownerId = registerResponse.body.data.user.id;

      // Simulate email verification for the owner
      const owner = await prisma.user.findUnique({
        where: { email: "owner@example.com" },
      });
      await prisma.user.update({
        where: { id: owner?.id },
        data: { emailVerified: new Date() }, // Mark the owner as verified
      });

      // Login as owner
      const loginResponse = await testApp.post("/api/auth/login").send({
        email: "owner@example.com",
        password: "Password123!",
      });

      const token = loginResponse.body.data.accessToken;

      // Delete the owner user
      const response = await testApp
        .delete(`/api/users/${ownerId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204); // No content on successful deletion

      // Try fetching the user again, expecting 404
      const fetchResponse = await testApp
        .get(`/api/users/${ownerId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404); // Expect 404 after the user is deleted
    });

    it("should return 403 if not OWNER", async () => {
      // Register owner via /api/auth/register
      const registerOwnerResponse = await testApp
        .post("/api/auth/register")
        .send({
          email: "owner@example.com",
          name: "Owner User",
          password: "Password123!",
          companyName: "Test Company",
        });
      const ownerId = registerOwnerResponse.body.data.user.id;

      // Create regular user via /users post
      const createUserResponse = await testApp
        .post("/api/users")
        .send({
          name: "User Name",
          email: "user@example.com",
          password: "Password123!",
          role: "USER", // Regular user role
        })
        .set(
          "Authorization",
          `Bearer ${registerOwnerResponse.body.data.accessToken}`,
        ); // Assuming owner token is used
      const userId = createUserResponse.body.data.id;

      // Simulate email verification for both users
      const owner = await prisma.user.findUnique({
        where: { email: "owner@example.com" },
      });
      const user = await prisma.user.findUnique({
        where: { email: "user@example.com" },
      });

      await prisma.user.update({
        where: { id: owner?.id },
        data: { emailVerified: new Date() }, // Mark the owner as verified
      });

      await prisma.user.update({
        where: { id: user?.id },
        data: { emailVerified: new Date() }, // Mark the regular user as verified
      });

      // Login as regular user (non-owner)
      const loginResponse = await testApp.post("/api/auth/login").send({
        email: "user@example.com",
        password: "Password123!",
      });

      const token = loginResponse.body.data.accessToken;

      // Try to delete the owner user as a non-owner
      const response = await testApp
        .delete(`/api/users/${ownerId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403); // Expect 403 if not OWNER

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Forbidden - Insufficient permissions",
      );
    });

    it("should return 401 if not authenticated", async () => {
      // Try to delete a user without a token (unauthenticated)
      const response = await testApp
        .delete("/api/users/non-existing-id")
        .expect(401); // Expect 401 Unauthorized

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Unauthorized - Invalid or expired token",
      );
    });
  });
});
