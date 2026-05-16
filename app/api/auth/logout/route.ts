import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns";

export async function POST() { //hàm POST để đăng xuất
  const res = NextResponse.json({ success: true }); //trả về response
  res.cookies.set(SESSION_COOKIE_NAME, "", { //xóa cookie session
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", //nếu NODE_ENV là production thì set secure là true
    sameSite: "lax", //set sameSite là lax
    path: "/", //set path là /
    maxAge: 0 //set maxAge là 0
  }); //xóa cookie session
  return res; //trả về response
}
//ghi đè để xóa cookie session