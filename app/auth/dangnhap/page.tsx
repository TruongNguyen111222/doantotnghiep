"use client";

import { useRouter, useSearchParams } from "next/navigation"; //chuyển trang khi đăng nhập thành công, lấy tham số next từ url trc khi middleware chạưn
import { FormEvent, Suspense, useMemo, useState } from "react";
import styles from "../styles/login.module.css";
import {
  getLoginRedirectDest, //lấy đường dẫn đích sau khi đăng nhập thành công
  getNetworkErrorMessage, //lấy thông báo lỗi khi không thể kết nối hệ thống
  mapLoginApiErrorToForm, //chuyển đổi lỗi API thành lỗi form để hiển thị cho user
  shouldShowForgotPassword,  //Quyết định có hiện link "Quên mật khẩu" không (ẩn với tài khoản admin)
  validateLoginForm //Kiểm tra email/password hợp lệ trước khi gửi lên server
} from "@/lib/utils/auth/login";
import LoginLeftPanel from "./components/LoginLeftPanel"; //panel bên trái trang đăng nhập
import LoginFormCard from "./components/LoginFormCard"; //panel bên phải trang đăng nhập

function LoginForm() { //hàm render ra trang đăng nhập
  //Khai báo toàn bộ biến trạng thái mà form đăng nhập cần để hoạt động.
  const router = useRouter(); //router để chuyển trang khi đăng nhập thành công
  const searchParams = useSearchParams(); //lấy tham số next từ url trc khi middleware chạưn
  const [identifier, setIdentifier] = useState(""); //email đăng nhập
  const [password, setPassword] = useState(""); //mật khẩu đăng nhập
  const [identifierError, setIdentifierError] = useState(""); //lỗi email
  const [passwordError, setPasswordError] = useState(""); //lỗi mật khẩu
  const [submitError, setSubmitError] = useState(""); //lỗi submit
  const [successMessage, setSuccessMessage] = useState(""); //thông báo thành công
  const [isSubmitting, setIsSubmitting] = useState(false); //trạng thái đang submit
  const [showPassword, setShowPassword] = useState(false); //trạng thái hiện/ẩn mật khẩu
  const [identifierFocused, setIdentifierFocused] = useState(false); //trạng thái focus email


  //Tính toán có nên hiển thị link "Quên mật khẩu" không, và cache lại kết quả để không tính lại mỗi lần render.
  const showForgotPassword = useMemo(() => {
    return shouldShowForgotPassword({ identifierFocused, identifier }); //trả về true nếu nên hiển thị link "Quên mật khẩu"
  }, [identifier, identifierFocused]); //cache kết quả để không tính lại mỗi lần render

  //Xử lý submit form đăng nhập
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); //ngăn chặn trang web reload khi submit form

    setIdentifierError(""); //xóa lỗi email
    setPasswordError("");
    setSubmitError(""); //xóa lỗi submit
    setSuccessMessage(""); //xóa thông báo thành công

    //Kiểm tra email/password hợp lệ trước khi gửi lên server
    let hasError = false;
    const validation = validateLoginForm({ identifier, password }); //kiểm tra email/password hợp lệ trước khi gửi lên server
    if (!validation.isValid) { //nếu không hợp lệ thì set lỗi email và mật khẩu
      if (validation.errors.identifier) setIdentifierError(validation.errors.identifier); //nếu email không hợp lệ thì set lỗi email
      if (validation.errors.password) setPasswordError(validation.errors.password); //nếu mật khẩu không hợp lệ thì set lỗi mật khẩu
      hasError = true; //nếu có lỗi thì set hasError thành true
    }
    if (hasError) return; //nếu có lỗi thì không gửi lên server

    try {
      setIsSubmitting(true); //set trạng thái đang submit
      const response = await fetch("/api/auth/login", { //gửi request đăng nhập lên server
        method: "POST",
        headers: { "Content-Type": "application/json" }, //set header là application/json
        body: JSON.stringify({ identifier, password }) //gửi body là identifier và password
      });
      const data = await response.json(); //lấy dữ liệu từ response

      if (!response.ok) { //nếu response không ok thì set lỗi password và identifier
        const mapped = mapLoginApiErrorToForm({ code: data.code, message: data.message }); //chuyển đổi lỗi API thành lỗi form để hiển thị cho user
        if (mapped.passwordError !== undefined) setPasswordError(mapped.passwordError); //nếu có lỗi mật khẩu thì set lỗi mật khẩu
        if (mapped.identifierError !== undefined) setIdentifierError(mapped.identifierError); //nếu có lỗi email thì set lỗi email
        if (mapped.submitError !== undefined) setSubmitError(mapped.submitError); //nếu có lỗi submit thì set lỗi submit
        setIsSubmitting(false); //set trạng thái đang submit thành false
        return; //không gửi lên server
      }

      setSuccessMessage(data.message || "Đăng nhập thành công."); 
      const dest = getLoginRedirectDest({ //lấy đường dẫn đích sau khi đăng nhập thành công
        nextRaw: searchParams.get("next"), //lấy next từ url
        redirectPath: data.redirectPath // next ko có thì dùng redirectPath
      }); //lấy đường dẫn đích sau khi đăng nhập thành công
      setTimeout(() => { //chuyển trang sau 800ms
        router.replace(dest); //chuyển trang đến đường dẫn đích
      }, 800);
    } catch {
      setSubmitError(getNetworkErrorMessage());
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <LoginLeftPanel />
      <LoginFormCard
        identifier={identifier}
        password={password}
        identifierError={identifierError}
        passwordError={passwordError}
        submitError={submitError}
        successMessage={successMessage}
        isSubmitting={isSubmitting}
        showPassword={showPassword}
        showForgotPassword={showForgotPassword}
        onIdentifierChange={setIdentifier}
        onIdentifierFocus={() => setIdentifierFocused(true)}
        onPasswordChange={setPassword}
        onTogglePassword={() => setShowPassword((prev) => !prev)}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className={styles.page} aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}
