"use client";

import { useRouter, useSearchParams } from "next/navigation"; 
import { FormEvent, Suspense, useMemo, useState } from "react";
import {
  getResetPasswordRedirectPath,
  getResetPasswordSubmitErrorMessage,
  getResetPasswordSuccessMessage,
  mapResetPasswordApiError,
  validateResetPasswordForm
} from "@/lib/utils/auth/reset-password"; //hàm validateResetPasswordForm để validate dữ liệu đăng nhập 
import ResetPasswordFormCard, { ResetPasswordFallback } from "./components/ResetPasswordFormCard"; //hàm ResetPasswordFormCard để hiển thị form đăng nhập

function ResetPasswordForm() { //hàm render ra form đăng nhập
  const router = useRouter(); //router để chuyển trang
  const searchParams = useSearchParams(); //lấy tham số từ url
  const email = useMemo(() => searchParams.get("email") || "", [searchParams]); //email đăng nhập
  const resetToken = useMemo(() => searchParams.get("token") || "", [searchParams]); //token đăng nhập
   //để truyền đi cho form đăng nhập
  const [newPassword, setNewPassword] = useState(""); //mật khẩu mới
  const [confirmPassword, setConfirmPassword] = useState(""); //mật khẩu xác nhận
  const [newPasswordError, setNewPasswordError] = useState(""); //lỗi mật khẩu mới
  const [confirmPasswordError, setConfirmPasswordError] = useState(""); //lỗi mật khẩu xác nhận
  const [submitError, setSubmitError] = useState(""); //lỗi submit
  const [successMessage, setSuccessMessage] = useState(""); //thông báo thành công
  const [isSubmitting, setIsSubmitting] = useState(false); //trạng thái đang submit

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { //hàm submit form đăng nhập 
    event.preventDefault();
    setNewPasswordError(""); //reset lỗi mật khẩu mới
    setConfirmPasswordError(""); //reset lỗi mật khẩu xác nhận
    setSubmitError(""); //reset lỗi submit
    setSuccessMessage(""); //reset thông báo thành công

    const validation = validateResetPasswordForm({ newPassword, confirmPassword, resetToken }); //validate dữ liệu đăng nhập
    if (!validation.isValid) { //nếu dữ liệu không hợp lệ thì set lỗi
      if (validation.errors.newPassword) setNewPasswordError(validation.errors.newPassword); //set lỗi mật khẩu mới
      if (validation.errors.confirmPassword) setConfirmPasswordError(validation.errors.confirmPassword); //set lỗi mật khẩu xác nhận
      if (validation.errors.submitError) setSubmitError(validation.errors.submitError); //set lỗi submit
      return; //nếu dữ liệu không hợp lệ thì không submit
    }

    try { //try catch để xử lý lỗi
      setIsSubmitting(true); //set trạng thái đang submit
      const response = await fetch("/api/auth/reset-password", { //gửi request đặt lại mật khẩu lên server
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: resetToken,
          newPassword,
          confirmPassword
        })
      });
      const data = await response.json();
      if (!response.ok) { //nếu response không ok thì set lỗi
        const mapped = mapResetPasswordApiError({ code: data.code, message: data.message });
        if (mapped.newPasswordError !== undefined) setNewPasswordError(mapped.newPasswordError); //set lỗi mật khẩu mới
        if (mapped.confirmPasswordError !== undefined) setConfirmPasswordError(mapped.confirmPasswordError); //set lỗi mật khẩu xác nhận
        if (mapped.submitError !== undefined) setSubmitError(mapped.submitError); //set lỗi submit
        setIsSubmitting(false); //set trạng thái đang submit    
        return; //nếu response không ok thì không submit
      }

      setSuccessMessage(getResetPasswordSuccessMessage({ responseMessage: data.message })); //set thông báo thành công
      setIsSubmitting(false); //set trạng thái đang submit
      setTimeout(() => { //chuyển trang sau 1200ms
        router.replace(getResetPasswordRedirectPath({ redirectPath: data.redirectPath })); //chuyển trang đến đường dẫn đích
      }, 1200);
    } catch { //catch để xử lý lỗi
      setSubmitError(getResetPasswordSubmitErrorMessage()); //set lỗi submit
      setIsSubmitting(false); //set trạng thái đang submit
    }
  };

  return (
    <ResetPasswordFormCard
      email={email} //truyền email đăng nhập    
      newPassword={newPassword}
      confirmPassword={confirmPassword} //truyền mật khẩu xác nhận
      newPasswordError={newPasswordError} //truyền lỗi mật khẩu mới
      confirmPasswordError={confirmPasswordError} //truyền lỗi mật khẩu xác nhận
      submitError={submitError}
      successMessage={successMessage}
      isSubmitting={isSubmitting}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleSubmit}
    />
  );
}

export default function ResetPasswordPage() { //hàm render ra page đặt lại mật khẩu
  return (
    <Suspense fallback={<ResetPasswordFallback />}> //fallback là component loading
      <ResetPasswordForm /> //render component ResetPasswordForm
    </Suspense>
  ); //Suspense là cơ chế của React để xử lý trường hợp component cần chờ một thứ gì đó trước khi render. Để tránh việc component bị render trước khi dữ liệu được tải xong.
}
