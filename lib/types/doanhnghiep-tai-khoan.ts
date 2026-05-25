export type ApiResponse<T> = { //kiểu dữ liệu trả về từ API
  success: boolean;
  message?: string;
  item?: T;
};

export type EnterpriseAccountFormState = { //kiểu dữ liệu trả về từ APIq
  email: string; //email của doanh nghiệp
  phone: string; //số điện thoại của doanh nghiệp
  representativeName: string;
  representativeTitle: string; //chức vụ của người đại diện của doanh nghiệp      
  companyIntro: string;
  website: string;
  provinceCode: string;
  wardCode: string;
  provinceName: string;
  wardName: string;
  addressDetail: string;
};

