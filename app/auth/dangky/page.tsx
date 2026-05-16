"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { AuthShell } from "../components/AuthShell";
import styles from "../styles/register.module.css";
import MessagePopup from "@/app/components/MessagePopup";
import { readFileAsBase64Payload } from "@/lib/utils/file-payload"; //đọc file và chuyển thành base64 để gửi lên server
import type { FormDataState, VnProvince, VnWard } from "@/lib/types/enterprise-register"; //type cho form đăng ký doanh nghiệp
import { EMPTY_ENTERPRISE_REGISTER_FORM } from "@/lib/constants/auth/enterprise-register"; //form đăng ký doanh nghiệp rỗng
import { getInitialRegisterForm, validateEnterpriseRegisterForm } from "@/lib/utils/auth/enterprise-register"; //hàm getInitialRegisterForm để lấy form đăng ký doanh nghiệp rỗng và hàm validateEnterpriseRegisterForm để validate form đăng ký doanh nghiệp
import { DOANHNGHIEP_BUSINESS_FIELD_OPTIONS } from "@/lib/constants/doanhnghiep"; //các lĩnh vực kinh doanh
import EnterpriseInfoSection from "./components/EnterpriseInfoSection"; //component cho phần thông tin doanh nghiệp
import RepresentativeSection from "./components/RepresentativeSection"; //component cho phần thông tin người đại diện

export default function EnterpriseRegisterPage() {
  const router = useRouter(); //router để chuyển hướng sau khi đăng ký thành công 
  const [form, setForm] = useState<FormDataState>(() =>
    getInitialRegisterForm(EMPTY_ENTERPRISE_REGISTER_FORM, {}, process.env.NEXT_PUBLIC_PREFILL_REGISTER)
  ); //lưu toàn bộ dữ liệu đăng ký doanh nghiệp
  //dữ liệu dropdown lĩnh vực kinh doanh
  const [facultyOptions, setFacultyOptions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [wards, setWards] = useState<VnWard[]>([]);
  const [addressLoading, setAddressLoading] = useState({ provinces: true, wards: false });
  const [addressError, setAddressError] = useState("");
  //upload file giấy phép kinh doanh và logo doanh nghiệp
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  //lỗi validate form đăng ký doanh nghiệp
  const [submitError, setSubmitError] = useState("");
  //thông báo đăng ký doanh nghiệp
  const [toast, setToast] = useState("");
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback((field: keyof FormDataState, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  //Khi trang vừa load xong, tự động gọi API lấy danh sách ngành/khoa để hiển thị trong dropdown chọn lĩnh vực kinh doanh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/faculties"); //gửi request lấy danh sách ngành/khoa đến server
        const data = (await res.json()) as { success?: boolean; faculties?: string[] };
        if (!res.ok) return;
        const items = Array.isArray(data.faculties) ? data.faculties.filter(Boolean) : [];
        if (!cancelled) setFacultyOptions(items); //lưu danh sách ngành/khoa vào state để hiển thị trong dropdown chọn lĩnh vực kinh doanh
      } catch {
        if (!cancelled) setFacultyOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); //chạy 1 lần duy nhất


  //Khi trang vừa load xong, tự động gọi API lấy danh sách tỉnh/thành để hiển thị trong dropdown chọn tỉnh/thành.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAddressLoading((s) => ({ ...s, provinces: true }));
      setAddressError("");
      try {
        const res = await fetch("/api/vn-address/provinces");
        const data = (await res.json()) as { provinces?: VnProvince[]; message?: string };
        if (!res.ok) throw new Error(data.message || "Không tải được tỉnh thành.");
        if (!cancelled) setProvinces(data.provinces || []);
      } catch (e) {
        if (!cancelled) setAddressError(e instanceof Error ? e.message : "Lỗi tải danh mục địa giới.");
      } finally {
        if (!cancelled) setAddressLoading((s) => ({ ...s, provinces: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
//Khi trang vừa load xong, tự động gọi API lấy danh sách phường/xã để hiển thị trong dropdown chọn phường/xã.
  const loadWards = useCallback(async (provinceCode: string) => {
    if (!provinceCode) { //nếu không chọn tỉnh/thành thì không hiển thị phường/xã
      setWards([]);
      return;
    }
    setAddressLoading((s) => ({ ...s, wards: true })); //hiển thị loading khi tải phường/xã
    setAddressError(""); //không có lỗi
    try {
      const res = await fetch(`/api/vn-address/provinces/${provinceCode}/wards`);
      const data = (await res.json()) as { wards?: VnWard[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Không tải được phường xã.");
      setWards(data.wards || []); //lưu danh sách phường/xã vào state để hiển thị trong dropdown chọn phường/xã  
    } catch (e) {
      setAddressError(e instanceof Error ? e.message : "Lỗi tải phường xã."); //lưu lỗi vào state để hiển thị lỗi
      setWards([]); //không hiển thị phường/xã
    } finally {
      setAddressLoading((s) => ({ ...s, wards: false })); //ẩn loading khi tải phường/xã
    }
  }, []);

  useEffect(() => {
    if (!form.provinceCode) { //nếu không chọn tỉnh/thành thì không hiển thị phường/xã
      setWards([]); //không hiển thị phường/xã
      return;
    }
    void loadWards(form.provinceCode); //tải phường/xã
  }, [form.provinceCode, loadWards]);

  const onChangeText = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { //khi người dùng nhập text vào input hoặc select thì lưu vào state
    const { name, value } = event.target; //lấy tên và giá trị của input hoặc select
    setField(name as keyof FormDataState, value); //lưu vào state
    setErrors((prev) => ({ ...prev, [name]: "" })); //không có lỗi
  };

  const onBusinessFieldsChange = (next: string[]) => { //khi người dùng chọn lĩnh vực kinh doanh thì lưu vào state
    setField("businessFields", next); //lưu vào state
    setErrors((prev) => ({ ...prev, businessFields: "" })); //không có lỗi
  };

  const onProvinceChange = (event: ChangeEvent<HTMLSelectElement>) => { //khi người dùng chọn tỉnh/thành thì lưu vào state
    const code = event.target.value; 
    const opt = event.target.selectedOptions[0]; //lấy tên tỉnh/thành
    const name = opt?.text || ""; //lấy tên tỉnh/thành
    setForm((prev) => ({
      ...prev, //lưu vào state
      provinceCode: code, //lưu vào state
      provinceName: code ? name : "",
      wardCode: "", //không chọn phường/xã
      wardName: "" //không chọn phường/xã   
    }));
    setErrors((prev) => ({ ...prev, province: "", ward: "" })); //không có lỗi
  };

  const onWardChange = (event: ChangeEvent<HTMLSelectElement>) => { //khi người dùng chọn phường/xã thì lưu vào state
    const code = event.target.value;
    const opt = event.target.selectedOptions[0]; //lấy tên phường/xã
    const name = opt?.text || ""; //lấy tên phường/xã
    setForm((prev) => ({
      ...prev, //lưu vào state
      wardCode: code, //lưu vào state
      wardName: code ? name : "" //lưu vào state
    }));
    setErrors((prev) => ({ ...prev, ward: "" }));
  };

  const onBusinessLicenseChange = (file: File | null, error: string) => {  //khi người dùng upload file giấy phép kinh doanh thì lưu vào state
    setBusinessLicense(file); //lưu vào state 
    setErrors((prev) => ({ ...prev, businessLicense: error })); //lưu lỗi vào state để hiển thị lỗi
  };

  const onCompanyLogoChange = (file: File | null, error: string) => { //khi người dùng upload file logo doanh nghiệp thì lưu vào state
    setCompanyLogo(file); //lưu vào state
    setErrors((prev) => ({ ...prev, companyLogo: error })); //lưu lỗi vào state để hiển thị lỗi
  };

  const validate = () => { //validate form đăng ký doanh nghiệp
    const { errors: nextErrors, isValid } = validateEnterpriseRegisterForm({ //validate form đăng ký doanh nghiệp
      form, //form đăng ký doanh nghiệp
      businessLicense, //file giấy phép kinh doanh
      companyLogo //file logo doanh nghiệp
    });
    setErrors(nextErrors); //lưu lỗi vào state để hiển thị lỗi
    return isValid; //trả về true nếu form đăng ký doanh nghiệp hợp lệ, false nếu không hợp lệ
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { //khi người dùng submit form đăng ký doanh nghiệp thì gửi lên server
    event.preventDefault(); //ngăn chặn trang web reload khi submit form
    setSubmitError(""); //không có lỗi
    if (!validate()) return; //nếu form không hợp lệ thì không gửi lên server

    try {
      setIsSubmitting(true); //hiển thị loading khi submit form
      const [licensePayload, logoPayload] = await Promise.all([ //đọc file giấy phép kinh doanh và logo doanh nghiệp và chuyển thành base64 để gửi lên server
        readFileAsBase64Payload(businessLicense!), //đọc file giấy phép kinh doanh và chuyển thành base64 để gửi lên server
        readFileAsBase64Payload(companyLogo!), //đọc file logo doanh nghiệp và chuyển thành base64 để gửi lên server
      ]);
      const { //lấy dữ liệu từ form đăng ký doanh nghiệp
        provinceCode,
        wardCode,
        provinceName,
        wardName,
        companyName,
        taxCode,
        businessFields,
        addressDetail,
        website,
        representativeName,
        representativeTitle,
        phone,
        email
      } = form;
      const response = await fetch("/api/auth/register-enterprise", { //gửi dữ liệu lên server
        method: "POST", 
        headers: { "Content-Type": "application/json" }, //gửi dữ liệu lên server dưới dạng json
        body: JSON.stringify({
          companyName,
          taxCode,
          businessFields,
          province: provinceName,
          ward: wardName,
          provinceCode,
          wardCode,
          addressDetail,
          website,
          representativeName,
          representativeTitle,
          phone,
          email,
          businessLicenseName: businessLicense?.name || "",
          businessLicenseMime: licensePayload.mime,
          businessLicenseBase64: licensePayload.base64,
          companyLogoName: companyLogo?.name || "",
          companyLogoMime: logoPayload.mime,
          companyLogoBase64: logoPayload.base64
        })
      }); //gửi dữ liệu lên server
      const data = await response.json(); //lấy dữ liệu từ server
      if (!response.ok) { //nếu không thành công thì hiển thị lỗi
        setErrors((prev) => ({ ...prev, [data.field || "submit"]: data.message || "Đăng ký thất bại." })); //lưu lỗi vào state để hiển thị lỗi
        if (!data.field) setSubmitError(data.message || "Đăng ký thất bại."); //lưu lỗi vào state để hiển thị lỗi
        setIsSubmitting(false); //ẩn loading khi submit form
        return;
      }
      setIsSubmitting(false); //ẩn loading khi submit form
      setToast(typeof data?.message === "string" && data.message ? data.message : "Đăng ký thành công."); //lưu thông báo vào state để hiển thị thông báo
      setShouldRedirectToLogin(true); //chuyển hướng đến trang đăng nhập
    } catch (err) {
      if (err instanceof Error && err.message === "invalid data URL") { //nếu lỗi là không đọc được file đính kèm thì hiển thị lỗi
        setSubmitError("Không đọc được file đính kèm. Vui lòng chọn file khác."); //lưu lỗi vào state để hiển thị lỗi
      } else {
        setSubmitError("Không thể kết nối hệ thống. Vui lòng thử lại."); //lưu lỗi vào state để hiển thị lỗi
      }
      setIsSubmitting(false);
    }
  };

  const addrBusy = addressLoading.provinces || addressLoading.wards; //hiển thị loading khi tải tỉnh/thành hoặc phường/xã

  return ( //hiển thị form đăng ký doanh nghiệp và các component con 
    <AuthShell variant="centeredWide"> 
      <h2 className={styles.title}>Đăng ký doanh nghiệp</h2>
      <p className={styles.desc}>Tạo tài khoản doanh nghiệp để kết nối thực tập với nhà trường.</p>

      <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <EnterpriseInfoSection
          form={form}
          errors={errors}
          businessFieldOptions={(facultyOptions.length ? facultyOptions : Array.from(DOANHNGHIEP_BUSINESS_FIELD_OPTIONS)) as string[]}
          provinces={provinces}
          wards={wards}
          addressLoading={addressLoading}
          addressError={addressError}
          addrBusy={addrBusy}
          isSubmitting={isSubmitting}
          onChangeText={onChangeText}
          onBusinessFieldsChange={onBusinessFieldsChange}
          onProvinceChange={onProvinceChange}
          onWardChange={onWardChange}
          onBusinessLicenseChange={onBusinessLicenseChange}
          onCompanyLogoChange={onCompanyLogoChange}
        />
        <RepresentativeSection
          form={form}
          errors={errors}
          isSubmitting={isSubmitting}
          onChangeText={onChangeText}
        />
        <button className={styles.button} type="submit" disabled={isSubmitting || addrBusy}>
          {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
        </button>
      </form>

      {submitError ? <p className={styles.errorGlobal}>{submitError}</p> : null}

      <div className={styles.linkRow}>
        <Link href="/auth/dangnhap">Quay lại đăng nhập</Link>
      </div>

      {toast ? (
        <MessagePopup
          open
          title="Thông báo"
          message={toast}
          onClose={() => {
            setToast("");
            if (shouldRedirectToLogin) router.replace("/auth/dangnhap");
          }}
        />
      ) : null}
    </AuthShell>
  );
}
