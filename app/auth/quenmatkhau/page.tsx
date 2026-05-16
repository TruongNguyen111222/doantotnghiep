"use client";

import { FormEvent, useState } from "react";
import {
  getForgotPasswordNetworkErrorMessage,
  getForgotPasswordSuccessMessage,
  mapForgotPasswordApiError,
  validateForgotPasswordForm
} from "@/lib/utils/auth/forgot-password"; //hàm validateForgotPasswordForm để validate dữ liệu đăng nhập
import ForgotPasswordSuccessCard from "./components/ForgotPasswordSuccessCard"; //hàm ForgotPasswordSuccessCard để hiển thị form thành công
import ForgotPasswordFormCard from "./components/ForgotPasswordFormCard"; //hàm ForgotPasswordFormCard để hiển thị form đăng nhập

export default function ForgotPasswordPage() { //hàm render ra trang quên mật khẩu
  const [email, setEmail] = useState(""); //nội dung người dùng nhập vào email
  const [emailError, setEmailError] = useState(""); //lỗi email
  const [submitError, setSubmitError] = useState(""); //lỗi submit
  const [successMessage, setSuccessMessage] = useState(""); //thông báo thành công
  const [isSubmitting, setIsSubmitting] = useState(false); //trạng thái đang submit

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { //hàm submit form quên mật khẩu
    event.preventDefault();
    setEmailError(""); //reset lỗi email
    setSubmitError(""); //reset lỗi submit

    const validation = validateForgotPasswordForm({ email }); // kiểm tra dữ liệu đăng nhập trước khi gửi lên server
    if (!validation.isValid) {
      if (validation.errors.email) setEmailError(validation.errors.email); //nếu có lỗi email thì set lỗi email
      return; //nếu có lỗi email thì không gửi lên server
    }
    const normalizedEmail = validation.normalizedEmail; //email đã được chuẩn hóa

    try {
      setIsSubmitting(true); //set trạng thái đang submit
      const response = await fetch("/api/auth/forgot-password", { //gửi lên server
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }) //gửi lên server
      });
      const data = await response.json();

      if (!response.ok) { //nếu không thành công thì set lỗi submit
        const mapped = mapForgotPasswordApiError({ code: data.code, message: data.message }); //chuyển lỗi từ API/backend thành lỗi để frontend hiển thị đúng chỗ.
        if (mapped.emailError !== undefined) setEmailError(mapped.emailError); //nếu có lỗi email thì set lỗi email
        setIsSubmitting(false); //set trạng thái đang submit
        return; //nếu có lỗi email thì không gửi lên server
      }

      setSuccessMessage(getForgotPasswordSuccessMessage({ responseMessage: data.message })); //set thông báo thành công
      setIsSubmitting(false); //set trạng thái đang submit
    } catch {
      setSubmitError(getForgotPasswordNetworkErrorMessage()); //set thông báo lỗi mạng
      setIsSubmitting(false); //set trạng thái đang submit
    }
  };

  if (successMessage) { //nếu có thông báo thành công thì hiển thị form thành công
    return <ForgotPasswordSuccessCard successMessage={successMessage} />; //hiển thị form thành công
  }

  return ( //trả về giao diện form quên mật khẩu
    <ForgotPasswordFormCard
      email={email} //email đăng nhập
      emailError={emailError} //lỗi email
      submitError={submitError} //lỗi submit
      isSubmitting={isSubmitting} //trạng thái đang submit
      onEmailChange={setEmail} //hàm thay đổi email
      onSubmit={handleSubmit} //hàm submit form quên mật khẩu
    />
  ); //trả về giao diện form quên mật khẩu
}
