"use client";

import { FormEvent, useState } from "react";
import {
  getForgotPasswordNetworkErrorMessage,
  getForgotPasswordSuccessMessage,
  mapForgotPasswordApiError,
  validateForgotPasswordForm
} from "@/lib/utils/auth/forgot-password"; 
import ForgotPasswordSuccessCard from "./components/ForgotPasswordSuccessCard";   
import ForgotPasswordFormCard from "./components/ForgotPasswordFormCard"; 

export default function ForgotPasswordPage() { 
  const [email, setEmail] = useState(""); 
  const [emailError, setEmailError] = useState(""); 
  const [submitError, setSubmitError] = useState(""); 
  const [successMessage, setSuccessMessage] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false); 

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { 
    event.preventDefault();
    setEmailError(""); 
    setSubmitError(""); 

    const validation = validateForgotPasswordForm({ email }); 
    if (!validation.isValid) {
      if (validation.errors.email) setEmailError(validation.errors.email); 
      return; 
    }
    const normalizedEmail = validation.normalizedEmail; 

    try {
      setIsSubmitting(true); 
      const response = await fetch("/api/auth/forgot-password", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }) 
      });
      const data = await response.json();

      if (!response.ok) { 
        const mapped = mapForgotPasswordApiError({ code: data.code, message: data.message }); 
        if (mapped.emailError !== undefined) setEmailError(mapped.emailError); 
        setIsSubmitting(false); 
        return; 
      }

      setSuccessMessage(getForgotPasswordSuccessMessage({ responseMessage: data.message })); 
      setIsSubmitting(false); 
    } catch {
      setSubmitError(getForgotPasswordNetworkErrorMessage()); 
      setIsSubmitting(false); 
    }
  };

    if (successMessage) { 
    return <ForgotPasswordSuccessCard successMessage={successMessage} />; 
  }

  return ( 
    <ForgotPasswordFormCard
      email={email} 
      emailError={emailError} 
      submitError={submitError} 
      isSubmitting={isSubmitting} 
      onEmailChange={setEmail} 
      onSubmit={handleSubmit} 
    />
  ); 
}
