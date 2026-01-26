import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting dev seed...");

  // Clean existing data (order matters because of FK)
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  // Create development test users
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1️⃣ Create company
  const company = await prisma.company.create({
    data: {
      name: "Auditly Demo Company",
    },
  });

  // 2️⃣ Create users linked to company
  const users = await prisma.user.createMany({
    data: [
      {
        name: "John Doe",
        email: "john@example.com",
        password: hashedPassword,
        role: "OWNER",
        companyId: company.id,
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        password: hashedPassword,
        role: "ADMIN",
        companyId: company.id,
      },
      {
        name: "Bob Johnson",
        email: "bob@example.com",
        password: hashedPassword,
        role: "USER",
        companyId: company.id,
      },
    ],
  });

  console.log("✅ Dev seed completed");
  console.log("Company:", company);
  console.log("Users created:", users.count);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding development data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
