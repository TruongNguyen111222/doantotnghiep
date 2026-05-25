export type Role = "sinhvien" | "doanhnghiep" | "giangvien"; //vai trò tài khoản
export type AccountStatus = "ACTIVE" | "STOPPED"; //trạng thái tài khoản

export type AccountRow = { //dòng tài khoản
  id: string; //id tài khoản
  fullName: string; //họ tên
  email: string; //email
  phone: string | null; //số điện thoại
  role: Role; //vai trò
  status: AccountStatus; //trạng thái
};

