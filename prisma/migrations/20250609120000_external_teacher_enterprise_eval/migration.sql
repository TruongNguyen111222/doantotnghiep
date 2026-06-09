-- AlterTable: Giảng viên ngoài trường
ALTER TABLE "SupervisorProfile" ADD COLUMN "isExternalTeacher" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Phiếu đánh giá kết quả thực tập của doanh nghiệp
ALTER TABLE "InternshipReport" ADD COLUMN "enterpriseEvalFileName" TEXT;
ALTER TABLE "InternshipReport" ADD COLUMN "enterpriseEvalMime" TEXT;
ALTER TABLE "InternshipReport" ADD COLUMN "enterpriseEvalBase64" TEXT;
