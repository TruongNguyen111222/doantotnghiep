"use client";

import { useRouter, useSearchParams } from "next/navigation"; 
import { FormEvent, Suspense, useMemo, useState } from "react";
import styles from "../styles/login.module.css";
import {
  getLoginRedirectDest, 
  getNetworkErrorMessage, 
  mapLoginApiErrorToForm, 
  shouldShowForgotPassword,  
  validateLoginForm 
} from "@/lib/utils/auth/login";
import LoginLeftPanel from "./components/LoginLeftPanel"; 
import LoginFormCard from "./components/LoginFormCard"; 

function LoginForm() { 
  const router = useRouter(); 
  const searchParams = useSearchParams(); 
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [identifierError, setIdentifierError] = useState(""); 
  const [passwordError, setPasswordError] = useState(""); 
  const [submitError, setSubmitError] = useState(""); 
  const [successMessage, setSuccessMessage] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [showPassword, setShowPassword] = useState(false); 
  const [identifierFocused, setIdentifierFocused] = useState(false); 

//Quyết định có hiện link "Quên mật khẩu" không (ẩn với tài khoản admin)
  const showForgotPassword = useMemo(() => {
    return shouldShowForgotPassword({ identifierFocused, identifier }); 
  }, [identifier, identifierFocused]); 

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault(); 

    setIdentifierError(""); 
    setPasswordError("");
    setSubmitError(""); 
    setSuccessMessage(""); 

    let hasError = false;
    const validation = validateLoginForm({ identifier, password }); 
    if (!validation.isValid) { 
      if (validation.errors.identifier) setIdentifierError(validation.errors.identifier); 
      if (validation.errors.password) setPasswordError(validation.errors.password); 
      hasError = true; 
    }
    if (hasError) return; 

    try {
      setIsSubmitting(true); 
      const response = await fetch("/api/auth/login", { 
        method: "POST",
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ identifier, password }) 
      });
      const data = await response.json(); 

      if (!response.ok) { 
        const mapped = mapLoginApiErrorToForm({ 
          code: data.code, 
          message: data.message 
        }); 
        if (mapped.passwordError !== undefined) setPasswordError(mapped.passwordError); 
        if (mapped.identifierError !== undefined) setIdentifierError(mapped.identifierError); 
        if (mapped.submitError !== undefined) setSubmitError(mapped.submitError); 
        setIsSubmitting(false); 
        return; 
      }

      setSuccessMessage(data.message || "Đăng nhập thành công."); 
        const dest = getLoginRedirectDest({ 
        nextRaw: searchParams.get("next"), 
        redirectPath: data.redirectPath 
      }); 
      setTimeout(() => { 
        router.replace(dest); 
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
