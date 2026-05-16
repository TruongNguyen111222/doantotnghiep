import "./globals.css";
import "./data-table-responsive.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cổng thông tin giáo dục", // hiện trên tab browser
  description: "Hệ thống quản lý thực tập",
  icons: {
    icon: "/logo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
//Đây là file chạy 1 lần khi app khởi động và bọc tất cả — 
// giống như cái vỏ ngoài cùng không bao giờ thay đổi dù bạn chuyển trang nào.