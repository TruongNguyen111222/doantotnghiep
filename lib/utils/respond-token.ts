import * as jose from "jose";
import { getSecretKey } from "@/lib/auth/jwt";
//định nghĩa các kiểu dữ liệu cho token phản hồi
export type RespondPurpose = "respond_interview" | "respond_offer";
export type RespondAction = "CONFIRM" | "DECLINE";

export interface RespondTokenPayload { //định nghĩa các kiểu dữ liệu cho token phản hồi
  purpose: RespondPurpose;
  appId: string;
  action: RespondAction;
}

/**
 * KHỐI CHỨC NĂNG: Ký tạo Token phản hồi nhanh qua Email gửi đến sinh viên để bấm xác nhận hoặc từ chối
 
 */
export async function signRespondToken( //hàm tạo token phản hồi
  payload: RespondTokenPayload,
  deadline: Date
): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000); //lấy thời gian hiện tại
  const expSec = Math.floor(deadline.getTime() / 1000); //lấy thời gian hết hạn
  const ttl = Math.max(expSec - nowSec, 1); //lấy thời gian hợp lệ
  return new jose.SignJWT({ ...payload }) //tạo token phản hồi
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt() //thời gian phát hành
    .setExpirationTime(ttl + "s")
    .sign(getSecretKey()); //ký token phản hồi
}
/**
 * KHỐI CHỨC NĂNG: Xác thực mã Token phản hồi từ Email sinh viên gửi lên
 * @param token Chuỗi JWT cần giải mã
 */
export async function verifyRespondToken(token: string): Promise<RespondTokenPayload> { //hàm xác thực token phản hồi
  const { payload } = await jose.jwtVerify(token, getSecretKey()); //giải mã token phản hồi
  const { purpose, appId, action } = payload as Record<string, unknown>; //lấy dữ liệu từ token
  // Kiểm tra tính hợp lệ của cấu trúc dữ liệu bên trong token  
  if (
    typeof purpose !== "string" || //kiểm tra tính hợp lệ của cấu trúc dữ liệu bên trong token
    typeof appId !== "string" || //kiểm tra tính hợp lệ của cấu trúc dữ liệu bên trong token
    typeof action !== "string" || //kiểm tra tính hợp lệ của cấu trúc dữ liệu bên trong token
    !["respond_interview", "respond_offer"].includes(purpose) || //kiểm tra tính hợp lệ của cấu trúc dữ liệu bên trong token
    !["CONFIRM", "DECLINE"].includes(action) //kiểm tra tính hợp lệ của cấu trúc dữ liệu bên trong token
  ) {
    throw new Error("Invalid respond token");
  }
  return { purpose: purpose as RespondPurpose, appId: appId as string, action: action as RespondAction };
}
