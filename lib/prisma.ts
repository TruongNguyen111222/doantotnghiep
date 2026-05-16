import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }; //khởi tạo prisma client để tránh tạo lại prisma client trong dev mode

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
//File này tạo ra 1 cái chìa khóa duy nhất để mở cửa vào database. Toàn bộ dự án dùng chung 1 cái chìa đó, không ai tự tạo chìa riêng.