"use client";

import { FormEvent, useEffect, useState } from "react";
import { clearAllClientCaches } from "@/lib/utils/client-query-cache"; //gọi hàm clearAllClientCaches để xóa tất cả bộ nhớ đệm
import {
  getChangePasswordNetworkErrorMessage,
  getChangePasswordSuccessMessage,
  mapChangePasswordApiError,
  normalizeAuthMeResponse, 
  validateChangePasswordForm
} from "@/lib/utils/auth/change-password"; //gọi hàm validateChangePasswordForm để kiểm tra form
import ChangePasswordFormCard from "./components/ChangePasswordFormCard"; //gọi component ChangePasswordFormCard
//
export default function ChangePasswordPage() { //component ChangePasswordPage
  const [currentPassword, setCurrentPassword] = useState("");   //mật khẩu hiện tại
  const [newPassword, setNewPassword] = useState("");   //mật khẩu mới
  const [confirmPassword, setConfirmPassword] = useState("");   //mật khẩu xác nhận
  const [currentPasswordError, setCurrentPasswordError] = useState("");   //lỗi mật khẩu hiện tại
  const [newPasswordError, setNewPasswordError] = useState("");   //lỗi mật khẩu mới
  const [confirmPasswordError, setConfirmPasswordError] = useState("");   //lỗi mật khẩu xác nhận
  const [submitError, setSubmitError] = useState("");   //lỗi submit
  const [successMessage, setSuccessMessage] = useState("");   //thông báo thành công
  const [isSubmitting, setIsSubmitting] = useState(false);   //trạng thái đang submit
  const [dashboardHome, setDashboardHome] = useState<string | null>(null);   //đường dẫn đích sau khi đăng nhập thành công
//useEffect chạy code khi trang vừa mở
  useEffect(() => {  //useEffect để lấy đường dẫn đích sau khi đăng nhập để quay lại sau khi đổi mật khẩu thành công
    void (async () => {
      try {
        const res = await fetch("/api/auth/me"); //gửi request đến api/auth/me lấy thông tin user
        if (!res.ok) return;
        const data = await res.json(); //lấy dữ liệu từ response
        const normalized = normalizeAuthMeResponse(data); //normalize dữ liệu từ response
        if (normalized.home) setDashboardHome(normalized.home); //nếu có đường dẫn đích sau khi đăng nhập thành công thì set đường dẫn đích sau khi đăng nhập thành công
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { //hàm handle submit để đổi mật khẩu
    event.preventDefault(); //ngăn chặn trang reload khi submit
    setCurrentPasswordError(""); //reset lỗi mật khẩu hiện tại
    setNewPasswordError(""); //reset lỗi mật khẩu mới
    setConfirmPasswordError(""); //reset lỗi mật khẩu xác nhận
    setSubmitError(""); //reset lỗi submit
    setSuccessMessage(""); //reset thông báo thành công

    const validation = validateChangePasswordForm({ currentPassword, newPassword, confirmPassword }); //validate form đổi mật khẩu
    if (!validation.isValid) { //nếu form không hợp lệ thì set lỗi
      if (validation.errors.currentPassword) setCurrentPasswordError(validation.errors.currentPassword); //nếu có lỗi mật khẩu hiện tại thì set lỗi mật khẩu hiện tại
      if (validation.errors.newPassword) setNewPasswordError(validation.errors.newPassword); //nếu có lỗi mật khẩu mới thì set lỗi mật khẩu mới
      if (validation.errors.confirmPassword) setConfirmPasswordError(validation.errors.confirmPassword); //nếu có lỗi mật khẩu xác nhận thì set lỗi mật khẩu xác nhận
      return; //nếu form không hợp lệ thì không submit
    }

    try {
      setIsSubmitting(true); //set trạng thái đang submit
      const response = await fetch("/api/auth/change-password", { //gửi request đến api/auth/change-password đổi mật khẩu lên server
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });
      const data = await response.json(); //lấy dữ liệu từ response

      if (!response.ok) { //nếu response không ok thì set lỗi
        const mapped = mapChangePasswordApiError({ code: data.code, message: data.message });
        if (mapped.currentPassword) setCurrentPasswordError(mapped.currentPassword); //nếu có lỗi mật khẩu hiện tại thì set lỗi mật khẩu hiện tại
        if (mapped.newPassword) setNewPasswordError(mapped.newPassword); //nếu có lỗi mật khẩu mới thì set lỗi mật khẩu mới
        if (mapped.confirmPassword) setConfirmPasswordError(mapped.confirmPassword); //nếu có lỗi mật khẩu xác nhận thì set lỗi mật khẩu xác nhận
        if (mapped.submitError) setSubmitError(mapped.submitError);
        setIsSubmitting(false);
        return;
      }
      //nếu response ok thì set thông báo thành công
      setSuccessMessage(getChangePasswordSuccessMessage({ responseMessage: data.message }));
      setCurrentPassword(""); //reset mật khẩu hiện tại
      setNewPassword(""); //reset mật khẩu mới
      setConfirmPassword(""); //reset mật khẩu xác nhận
      setIsSubmitting(false); //set trạng thái đang submit thành false
      setTimeout(() => { //chuyển trang sau 1200ms
        void (async () => {
          try { //try catch để xử lý lỗi
            await fetch("/api/auth/logout", { method: "POST" }); //gửi request đến api/auth/logout đăng xuất lên server
          } catch { //catch để xử lý lỗi
            // ignore //ignore lỗi
          }
          clearAllClientCaches(); //xóa tất cả bộ nhớ đệm
          window.location.replace("/auth/dangnhap"); //chuyển trang đến đường dẫn đăng nhập
        })();
      }, 1200); //chuyển trang sau 1200ms
    } catch {
      setSubmitError(getChangePasswordNetworkErrorMessage()); 
      setIsSubmitting(false);
    }
  };

  return (
    <ChangePasswordFormCard
      currentPassword={currentPassword}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      currentPasswordError={currentPasswordError}
      newPasswordError={newPasswordError}
      confirmPasswordError={confirmPasswordError}
      submitError={submitError}
      successMessage={successMessage}
      isSubmitting={isSubmitting}
      dashboardHome={dashboardHome}
      onCurrentPasswordChange={setCurrentPassword}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleSubmit}
    />
  );
}
