import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Production seed starting...");

  // Check if any company already exists
  const companyCount = await prisma.company.count();

  if (companyCount > 0) {
    console.log("Skipping production seed — company already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1️⃣ Create company + owner atomically
  const company = await prisma.company.create({
    data: {
      name: "Auditly Production",

      users: {
        create: {
          name: "Admin User",
          email: "admin@express-boilerplate.com",
          password: hashedPassword,
          role: "OWNER",
        },
      },
    },
    include: {
      users: true,
    },
  });

  console.log("✅ Production seed completed");
  console.log("Company:", company.name);
  console.log("Owner:", company.users[0].email);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding production data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
