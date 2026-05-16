import type { EnterpriseStatus } from "@prisma/client";
//“quy định dữ liệu doanh nghiệp phải có những gì” 
export type PendingEnterpriseItem = { //Kiểu dữ liệu cho doanh nghiệp chờ duyệt.
  id: string; 
  email: string; //email doanh nghiệp
  phone: string | null;  
  fullName: string;
  companyName: string | null; //tên doanh nghiệp
  taxCode: string | null; //mã số thuế doanh nghiệp
  enterpriseMeta: unknown; //dữ liệu doanh nghiệp
  createdAt: string; //ngày tạo
};

export type AdminEnterpriseListItem = { //Kiểu dữ liệu cho 1 dòng danh sách doanh nghiệp.
  id: string; //id doanh nghiệp
  email: string; //email doanh nghiệp
  companyName: string | null; //tên doanh nghiệp
  taxCode: string | null; //mã số thuế doanh nghiệp
  enterpriseStatus: EnterpriseStatus | null; //trạng thái doanh nghiệp
  isLocked: boolean; //trạng thái khóa doanh nghiệp
  createdAt: string; //ngày tạo
};

export type AdminEnterpriseDetail = AdminEnterpriseListItem & { //Kiểu dữ liệu cho chi tiết doanh nghiệp.
  phone: string | null; //số điện thoại doanh nghiệp
  fullName: string; //tên doanh nghiệp
  representativeTitle: string | null; //chức vụ đại diện doanh nghiệp
  enterpriseMeta: unknown; //dữ liệu doanh nghiệp
  updatedAt: string; //ngày cập nhật
}; //Kiểu dữ liệu cho chi tiết doanh nghiệp.
