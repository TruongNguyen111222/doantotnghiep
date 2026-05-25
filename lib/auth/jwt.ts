import * as jose from "jose";

export function getSecretKey() {
  const s = process.env.SECRET; 
  if (!s) throw new Error("SECRET is required in environment"); 
  return new TextEncoder().encode(s); 
}

//Tạo token đăng nhập
export async function signSession(payload: { 
  sub: string; 
  role: string; 
  email: string 
}) { 
  return new jose.SignJWT({ 
    role: payload.role, 
    email: payload.email 
  }) 
    .setProtectedHeader({ alg: "HS256" }) 
    .setSubject(payload.sub) 
    .setIssuedAt() 
    .setExpirationTime("7d") 
    .sign(getSecretKey());
}


export async function verifySession(token: string) {
  const { payload } = await jose.jwtVerify(token, getSecretKey()); 
  const sub = payload.sub; 
  const role = payload.role; 
  const email = payload.email; 
  if (typeof sub !== "string" || typeof role !== "string" || typeof email !== "string") { 
    throw new Error("Invalid session token"); 
  }
  return { sub, role, email }; 
}

//Tạo token đặt lại mật khẩu
export async function signPasswordResetToken(email: string) {
  return new jose.SignJWT({ purpose: "password_reset", email }) 
    .setProtectedHeader({ alg: "HS256" }) 
    .setIssuedAt() 
    .setExpirationTime("15m") 
    .sign(getSecretKey()); 
}

export async function verifyPasswordResetToken(token: string) { 
  const { payload } = await jose.jwtVerify(token, getSecretKey()); 
  if (payload.purpose !== "password_reset" || typeof payload.email !== "string") { 
    throw new Error("Invalid reset token"); 
  }
  return { email: payload.email }; 
}
