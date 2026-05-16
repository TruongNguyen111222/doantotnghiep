import { NextResponse } from "next/server"; //dùng để tạo phản hồi gửi về trình duyệt
import type { NextRequest } from "next/server"; //dùng để lấy thông tin về request
import { jwtVerify } from "jose"; //dùng để verify token JWT
import { AUTH_EXACT_ROUTES_REQUIRE_SESSION, ROLE_PROTECTED_ROUTE_PREFIXES } from "@/lib/constants/auth/guards"; //dùng để kiểm tra route có cần session hay không
import { SESSION_COOKIE_NAME } from "@/lib/constants/auth/patterns"; //dùng để lấy tên cookie session
import { ROLE_HOME } from "@/lib/constants/routing"; //dùng để lấy trang chủ của từng role

//lấy khóa từ env và mã hóa sang byte để sử dụng trong jwtVerify
function encodeSecret() {
  const s = process.env.SECRET; //lấy khóa từ env
  if (!s) return null; //nếu không có khóa thì trả về null
  return new TextEncoder().encode(s); //mã hóa khó từ chuỗi sang byte
} // nếu ko có hàm này thì không biết cookie của user có hợp lệ không → không bảo vệ được các trang cần đăng nhập.


//đuổi user về trang đăng nhập, nhưng nhớ lại trang user đang muốn vào để sau khi login xong thì quay lại đúng chỗ.
function loginRedirect(request: NextRequest, nextPath: string) {
  const login = new URL("/auth/dangnhap", request.url); //tạo url đăng nhập
  login.searchParams.set("next", nextPath); //thêm tham số next vào url để sau khi login xong thì quay lại đúng chỗ.
  return NextResponse.redirect(login); //Bắt trình duyệt chuyển hướng sang URL vừa tạo. Trình duyệt sẽ load trang đăng nhập.
}

//làm 1 việc: nhìn vào role của user rồi đưa họ về đúng dashboard của role đó.
function sessionHomeRedirect(request: NextRequest, role: string) { //request: NextRequest là toàn bộ thông tin request từ trình duyệt gửi lên , role: string là role của user
  const home = ROLE_HOME[role]; //lấy url của dashboard theo role đó
  if (!home) return NextResponse.next(); //nếu không có url của dashboard thì không chuyển hướng cho đi qua
  return NextResponse.redirect(new URL(home, request.url)); //chuyển hướng sang url của dashboard của role đó
}


//mọi request đều phải đi qua middleware này, middleware sẽ kiểm tra xem user có đủ quyền vào trang đó hay không.
export async function middleware(request: NextRequest) { //async function là hàm không đồng bộ, tức là hàm này có thể chạy song song với các hàm khác.
  const { pathname } = request.nextUrl;  //lấy đường dẫn của request
  const secret = encodeSecret(); //gọi hàm encodeSecret() để lấy khóa từ env và mã hóa sang byte để sử dụng trong jwtVerify

  //Xử lý trang chủ /
  if (pathname === "/" && secret) { // xử lý trang chủ . chỉ chạy khối này nếu đang vào trang chủ / và có secret
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value; //lấy token từ cookie
    if (token) { //nếu có token thì kiểm tra xem token có hợp lệ không
      try {
        const { payload } = await jwtVerify(token, secret); //giải mã token nếu hợp lệ trả về payload chứa thông tin user
        const role = typeof payload.role === "string" ? payload.role : ""; //lấy role từ payload
        return sessionHomeRedirect(request, role); //có session hợp lệ → đưa về dashboard
      } catch { //nếu token không hợp lệ thì không cho đi qua
        const res = NextResponse.next();
        res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });//xét cookie session bằng 0 về trạng thái không có session
        return res;
      }
    }
  }


  //— Xử lý các trang cần login theo role /sinhvien/*, /admin/*...
  const roleMatch = ROLE_PROTECTED_ROUTE_PREFIXES.find( // duyệt kiểm tra xem đường dẫn có phải là đường dẫn của role protected hay không
    (p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`)  //ìm xem pathname có khớp với prefix nào không
  ); //nếu tìm thấy thì trả về đối tượng roleMatch chứa prefix và role

  if (roleMatch) {
    if (!secret) { //không có SECRET trong .env → đá về login luôn
      return loginRedirect(request, pathname); //đưa về trang đăng nhập
    }
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value; //lấy token từ cookie
    if (!token) {
      return loginRedirect(request, pathname); //không có cookie → đá về login, kèm ?next=pathname để sau login quay lại
    }
    try { //kiểm tra token có hợp lệ không
      const { payload } = await jwtVerify(token, secret); //giải mã token nếu hợp lệ trả về payload chứa thông tin user
      const role = typeof payload.role === "string" ? payload.role : ""; //lấy role từ payload
      if (role !== roleMatch.role) { //có token nhưng sai role → đá về dashboard của role đó
        const home = ROLE_HOME[role] ?? "/"; //lấy url của dashboard theo role đó
        return NextResponse.redirect(new URL(home, request.url)); //chuyển hướng sang url của dashboard của role đó
      }
    } catch { //nếu token không hợp lệ thì không cho đi qua
      const res = loginRedirect(request, pathname); //đưa về trang đăng nhập
      res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return res;   //xét cookie session bằng 0 về trạng thái không có session
    }
    return NextResponse.next(); //qua hết các kiểm tra → cho vào dashboard
  }


  //Xử lý /auth/doimatkhau (cần login nhưng nằm trong /auth/)
  if (AUTH_EXACT_ROUTES_REQUIRE_SESSION.includes(pathname as (typeof AUTH_EXACT_ROUTES_REQUIRE_SESSION)[number])) { //kiểm tra pathname có nằm trong danh sách ["/auth/doimatkhau"] không
    if (!secret) { //không có SECRET trong .env → đá về login luôn
      return loginRedirect(request, pathname);
    }
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) { //không có cookie → đá về login, kèm ?next=pathname để sau login quay lại
      return loginRedirect(request, pathname);
    }
    try {
      const { payload } = await jwtVerify(token, secret); //giải mã token nếu hợp lệ trả về payload chứa thông tin user
      const role = typeof payload.role === "string" ? payload.role : ""; //lấy role từ payload
      if (role === "admin") { //nếu role là admin thì chuyển hướng sang url của dashboard của admin admin không được đổi mật khẩu qua đây → đá về /admin/dashboard
        return NextResponse.redirect(new URL(ROLE_HOME.admin, request.url)); //chuyển hướng sang url của dashboard của admin
      }
    } catch { //nếu token không hợp lệ thì không cho đi qua
      const res = loginRedirect(request, pathname); //đưa về trang đăng nhập
      res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return res;   //xét cookie session bằng 0 về trạng thái không có session
    }
    return NextResponse.next(); //qua hết các kiểm tra → cho vào dashboard
  }


  //Logic ngược với Khối 2: đây là trang dành cho người chưa login → nếu đã login thì đá ra
  // Xử lý các trang guest (không cần login) /auth/dangnhap, /auth/dangky...
  const isGuestAuthRoute = //isGuestAuthRoute — true nếu URL bắt đầu /auth/ và không phải /auth/doimatkhau
    pathname.startsWith("/auth/") && 
    !AUTH_EXACT_ROUTES_REQUIRE_SESSION.includes(pathname as (typeof AUTH_EXACT_ROUTES_REQUIRE_SESSION)[number]); 
  if (isGuestAuthRoute && secret) {  //nếu đường dẫn là đường dẫn của auth và có secret thì kiểm tra xem user có đủ quyền vào trang đó hay không.
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value; //lấy token từ cookie
    if (token) { //nếu có token thì kiểm tra xem token có hợp lệ không
      try { 
        const { payload } = await jwtVerify(token, secret); //giải mã token nếu hợp lệ trả về payload chứa thông tin user
        const role = typeof payload.role === "string" ? payload.role : "";
        return sessionHomeRedirect(request, role); //có session hợp lệ → đưa về dashboard 
      } catch {
        const res = NextResponse.next(); //không có session → đá về trang đăng nhập
        res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 }); //xét cookie session bằng 0 về trạng thái không có session  
        return res; //trả về trang đăng nhập
      }
    }
  }

  return NextResponse.next(); //qua hết các kiểm tra → cho vào dashboard
}

//Đây là cấu hình nói với Next.js: "Middleware chỉ chạy với những URL này thôi, còn lại bỏ qua".
//Nếu không có cấu hình này thì middleware sẽ chạy cho tất cả các đường dẫn trong project.
//ko có matcher  -> Tất cả đều chạy qua middleware → chậm
export const config = {
  matcher: [
    "/", //trang chủ
    "/admin/:path*",
    "/giangvien/:path*",
    "/sinhvien/:path*",
    "/doanhnghiep/:path*",
    "/auth/:path*"
  ]
};
///api/* không có trong matcher — tức là các API route như /api/auth/login, 
// /api/sinhvien/... đều không qua middleware. Các API tự bảo vệ bằng cách đọc cookie session bên trong code của chúng