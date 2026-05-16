import type { ReactNode } from "react";

/** Nhóm route /auth — middleware xử lý phiên; các trang con dùng replace/history để hạn chế Back không mong muốn. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
// 