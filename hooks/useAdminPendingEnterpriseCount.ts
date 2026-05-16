"use client";
//đếm số doanh nghiệp đang chờ duyệt
import { useCallback, useEffect, useState } from "react";

const POLL_MS = 60_000; //tự động cập nhật số lượng doanh nghiệp chờ duyệt sau 60 giây

export const ADMIN_PENDING_ENTERPRISES_CHANGED_EVENT = "admin-pending-enterprises-changed"; //sự kiện thay đổi số lượng doanh nghiệp chờ duyệt

export function useAdminPendingEnterpriseCount(enabled: boolean) { //hàm đếm số doanh nghiệp đang chờ duyệt
  const [count, setCount] = useState<number | null>(null);

  const refresh = useCallback(async () => { //hàm tự động cập nhật số lượng doanh nghiệp chờ duyệt
    if (!enabled) return; //nếu không có quyền truy cập thì không cập nhật số lượng doanh nghiệp chờ duyệt
    try {
      const res = await fetch("/api/admin/pending-enterprises/count", { cache: "no-store" }); //gửi request đến API để lấy số lượng doanh nghiệp chờ duyệt
      if (!res.ok) return; //nếu không có kết quả thì không cập nhật số lượng doanh nghiệp chờ duyệt
      const data = (await res.json()) as { count?: unknown };
      if (typeof data.count === "number" && Number.isFinite(data.count)) { //nếu số lượng doanh nghiệp chờ duyệt là số thì cập nhật số lượng doanh nghiệp chờ duyệt
        setCount(Math.max(0, data.count)); //cập nhật số lượng doanh nghiệp chờ duyệt
      }
    } catch {
      /* ignore */ //nếu có lỗi thì không cập nhật số lượng doanh nghiệp chờ duyệt
    }
  }, [enabled]);

  useEffect(() => { //hàm tự động cập nhật số lượng doanh nghiệp chờ duyệt
    void refresh();
  }, [refresh]);

  useEffect(() => { //hàm tự động cập nhật số lượng doanh nghiệp chờ duyệt
    if (!enabled) return; //nếu không có quyền truy cập thì không cập nhật số lượng doanh nghiệp chờ duyệt
    const id = setInterval(() => void refresh(), POLL_MS); //tự động cập nhật số lượng doanh nghiệp chờ duyệt sau 60 giây
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh(); //nếu trang web là visible thì tự động cập nhật số lượng doanh nghiệp chờ duyệt
    };
    const onPendingChanged = () => void refresh(); //nếu số lượng doanh nghiệp chờ duyệt thay đổi thì tự động cập nhật số lượng doanh nghiệp chờ duyệt
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(ADMIN_PENDING_ENTERPRISES_CHANGED_EVENT, onPendingChanged); //thêm sự kiện thay đổi số lượng doanh nghiệp chờ duyệt
    return () => { //xóa sự kiện thay đổi số lượng doanh nghiệp chờ duyệt
      clearInterval(id); //xóa sự kiện tự động cập nhật số lượng doanh nghiệp chờ duyệt
      document.removeEventListener("visibilitychange", onVis); //xóa sự kiện thay đổi số lượng doanh nghiệp chờ duyệt
      window.removeEventListener(ADMIN_PENDING_ENTERPRISES_CHANGED_EVENT, onPendingChanged); //xóa sự kiện thay đổi số lượng doanh nghiệp chờ duyệt
    };
  }, [enabled, refresh]); //hàm tự động cập nhật số lượng doanh nghiệp chờ duyệt

  return { count, refresh }; //trả về số lượng doanh nghiệp chờ duyệt và hàm tự động cập nhật số lượng doanh nghiệp chờ duyệt
}
