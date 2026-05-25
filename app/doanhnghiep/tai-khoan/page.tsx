"use client";

import { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css";
import MessagePopup from "../../components/MessagePopup";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";  //loading
import type { AdminEnterpriseDetail } from "@/lib/types/admin"; //kiểu dữ liệu trả về từ API
import type { ApiResponse, EnterpriseAccountFormState } from "@/lib/types/doanhnghiep-tai-khoan"; //kiểu dữ liệu trả về từ API
import {
  ENTERPRISE_ACCOUNT_EMPTY_FORM, 
  ENTERPRISE_ACCOUNT_LOAD_ERROR_DEFAULT,
  ENTERPRISE_ACCOUNT_ME_ENDPOINT,
  ENTERPRISE_ACCOUNT_NOT_FOUND_ERROR_DEFAULT,
  ENTERPRISE_ACCOUNT_SUBMIT_ERROR_DEFAULT,
  ENTERPRISE_ACCOUNT_SUBMIT_SUCCESS_DEFAULT
} from "@/lib/constants/doanhnghiep-tai-khoan"; //hằng số cho API
import {
  buildEnterpriseHeadquartersAddress,
  dataUrlFromBase64
} from "@/lib/utils/enterprise-admin-display"; //hàm xử lý địa chỉ doanh nghiệp
import { metaRecord } from "@/lib/utils/enterprise-meta"; //hàm xử lý thông tin doanh nghiệp
import { formatAdminEnterpriseStatusLine } from "@/lib/utils/admin-enterprise-display"; //hàm xử lý trạng thái doanh nghiệp
import {
  buildCloudinaryImageDeliveryUrl,
  enterpriseLicensePublicIdFromStored,
  fromCloudinaryRef
} from "@/lib/storage/cloudinary-public"; //hàm xử lý ảnh doanh nghiệp
import {
  buildEnterpriseAccountPatchPayload,
  mapEnterpriseAccountFormFromMe,
  validateEnterpriseAccountForm
} from "@/lib/utils/doanhnghiep-tai-khoan"; //hàm xử lý form doanh nghiệp
import { getCachedValue, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";
import EnterpriseProfileInfo from "./components/EnterpriseProfileInfo"; //component hiển thị thông tin doanh nghiệp
import EnterpriseAccountEditSection from "./components/EnterpriseAccountEditSection"; //component hiển thị form doanh nghiệp
import type { Province, Ward } from "@/lib/types/admin-quan-ly-sinh-vien"; //kiểu dữ liệu trả về từ API tỉnh/thành
import { readFileAsBase64Payload } from "@/lib/utils/file-payload"; //hàm xử lý file

type FormState = EnterpriseAccountFormState;

const DN_TAI_KHOAN_CACHE_KEY = "doanhnghiep:tai-khoan:me"; //cache key cho tài khoản doanh nghiệp

export default function EnterpriseAccountPage() { //hàm xử lý tài khoản doanh nghiệp
  /* KHỞI TẠO CÁC STATE QUẢN LÝ TRẠNG THÁI GIAO DIỆN VÀ DỮ LIỆU FORM */
  const [loading, setLoading] = useState(() => !hasCachedValue(DN_TAI_KHOAN_CACHE_KEY));
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const dismissToast = () => setToast("");
  const dismissErrorToast = () => setError("");

  const [me, setMe] = useState<AdminEnterpriseDetail | null>(() => getCachedValue<ApiResponse<AdminEnterpriseDetail>>(DN_TAI_KHOAN_CACHE_KEY)?.item ?? null);
  const [form, setForm] = useState<FormState>(ENTERPRISE_ACCOUNT_EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");

  // address dropdowns
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [addrLoading, setAddrLoading] = useState({ provinces: true, wards: false });

  /* TỰ ĐỘNG CHẠY KHI VÀO TRANG - TẢI THÔNG TIN CHI TIẾT CỦA DOANH NGHIỆP TỪ API */
  useEffect(() => { 
    let cancelled = false;
    (async () => { 
      try {
        if (!hasCachedValue(DN_TAI_KHOAN_CACHE_KEY)) setLoading(true); //nếu không có cache thì hiển thị loading
        setError("");
        const data = await getOrFetchCached<ApiResponse<AdminEnterpriseDetail>>( 
          DN_TAI_KHOAN_CACHE_KEY,
          async () => {              ///api/doanhnghiep/me
            const res = await fetch(ENTERPRISE_ACCOUNT_ME_ENDPOINT); //gửi request lấy thông tin doanh nghiệp từ API
            const json = (await res.json()) as ApiResponse<AdminEnterpriseDetail>;
            if (!res.ok || !json.success) throw new Error(json.message || ENTERPRISE_ACCOUNT_LOAD_ERROR_DEFAULT);
            return json;
          }
        );
        if (cancelled) return; //nếu đã bị hủy thì không thực hiện
        if (!data.item) throw new Error(ENTERPRISE_ACCOUNT_NOT_FOUND_ERROR_DEFAULT);
        setMe(data.item); //lấy thông tin doanh nghiệp từ API
        setForm(mapEnterpriseAccountFormFromMe(data.item)); //chuyển đổi thông tin doanh nghiệp thành form
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : ENTERPRISE_ACCOUNT_LOAD_ERROR_DEFAULT);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { //hàm xử lý hủy tải thông tin doanh nghiệp
      cancelled = true;
    };
  }, []);

/*TỰ ĐỘNG CHẠY KHI VÀO TRANG - TẢI DANH SÁCH CÁC TỈNH / THÀNH PHỐ VIỆT NAM */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setAddrLoading({ provinces: true, wards: false }); //hiển thị loading cho tỉnh/thành
        const res = await fetch("/api/vn-address/provinces"); //gửi request lấy danh sách tỉnh/thành từ API
        const data = await res.json();
        if (!cancelled) setProvinces((data.provinces || []) as Province[]);
      } catch {
        if (!cancelled) setProvinces([]);
      } finally {
        if (!cancelled) setAddrLoading((s) => ({ ...s, provinces: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  ///*TỰ ĐỘNG CHẠY KHI ĐỔI TỈNH/THÀNH - TẢI DANH SÁCH PHƯỜNG / XÃ TƯƠNG ỨNG */
  useEffect(() => { // 
    let cancelled = false;
    void (async () => {
      const code = form.provinceCode?.trim();
      if (!code) {
        setWards([]);
        return;
      }
      setAddrLoading((s) => ({ ...s, wards: true })); 
      try {
        const res = await fetch(`/api/vn-address/provinces/${encodeURIComponent(code)}/wards`); //gửi request lấy danh sách phường/xã từ API
        const data = await res.json();
        if (!cancelled) setWards((data.wards || []) as Ward[]);
      } catch {
        if (!cancelled) setWards([]);
      } finally {
        if (!cancelled) setAddrLoading((s) => ({ ...s, wards: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.provinceCode]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isEditing || saving) return;
      void reloadMe();
    }, 30000);
    return () => clearInterval(timer);
  }, [isEditing, saving]);

  /* : CÁC HÀM TRỢ GIÚP (THAY ĐỔI Ô INPUT, HOẶC KIỂM TRA VALIDATE FORM DỮ LIỆU) */
  const setField = (key: keyof FormState, value: string | string[]) => { //hàm xử lý thay đổi ô input
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => { //hàm xử lý kiểm tra form doanh nghiệp
    const { isValid, errors } = validateEnterpriseAccountForm(form);
    setFieldErrors(errors);
    return isValid;
  };

  /* XỬ LÝ SUBMIT - MÃ HÓA LOGO VÀ GỬI REQUEST CẬP NHẬT (PATCH) LÊN SERVER */
  const submit = async () => { //hàm xử lý gửi form doanh nghiệp
    if (!isEditing) return;
    setToast("");
    setError("");
    if (!validate()) return;
    try {
      setSaving(true); //hiển thị loading khi gửi form doanh nghiệp
      setLogoError("");
      let logoPayload: { base64: string; mime: string } | null = null;
      if (logoFile) {
        logoPayload = await readFileAsBase64Payload(logoFile);
      }
      //gửi request gửi form doanh nghiệp từ API chức năng sửa 
      const res = await fetch("/api/doanhnghiep/me", { //gửi request gửi form doanh nghiệp từ API
        method: "PATCH",
        headers: { "Content-Type": "application/json" }, //gửi dữ liệu lên server dưới dạng json
        body: JSON.stringify({
          ...buildEnterpriseAccountPatchPayload(form), //xây dựng payload đăng ký doanh nghiệp
          ...(logoPayload
            ? {
                companyLogoName: logoFile?.name || "",
                companyLogoMime: logoPayload.mime,
                companyLogoBase64: logoPayload.base64
              }
            : {})
        })
      });
      const data = (await res.json()) as ApiResponse<unknown> & { field?: string }; //lấy dữ liệu từ API
      if (!res.ok || !data.success) { //nếu không thành công thì hiển thị lỗi
        if (data.field && typeof data.field === "string" && data.message) { //nếu có lỗi thì hiển thị lỗi
          setFieldErrors({ [data.field]: data.message }); //hiển thị lỗi
        }
        throw new Error(data.message || ENTERPRISE_ACCOUNT_SUBMIT_ERROR_DEFAULT); //hiển thị lỗi
      }
      setToast(data.message || ENTERPRISE_ACCOUNT_SUBMIT_SUCCESS_DEFAULT); //hiển thị thông báo thành công
      await reloadMe(); //tải lại thông tin doanh nghiệp
      setIsEditing(false); //ẩn form doanh nghiệp
      setLogoFile(null); //xóa file logo
    } catch (e) {
      if (e instanceof Error && e.message === "invalid data URL") {
        setLogoError("Không đọc được file logo. Vui lòng chọn file khác.");
      } else {
        setError(e instanceof Error ? e.message : ENTERPRISE_ACCOUNT_SUBMIT_ERROR_DEFAULT);
      }
    } finally {
      setSaving(false); //ẩn loading khi gửi form doanh nghiệp
    }
  };

/* HÀM LÀM MỚI DỮ LIỆU HỒ SƠ DOANH NGHIỆP TRONG BỘ NHỚ CACHE ĐỂ ĐỒNG BỘ */
  const reloadMe = async () => { //hàm xử lý tải lại thông tin doanh nghiệp
    try { 
      const data = await getOrFetchCached<ApiResponse<AdminEnterpriseDetail>>( //hàm xử lý tải lại thông tin doanh nghiệp
        DN_TAI_KHOAN_CACHE_KEY,
        async () => {
          const res = await fetch(ENTERPRISE_ACCOUNT_ME_ENDPOINT); //gửi request lấy thông tin doanh nghiệp từ API
          return (await res.json()) as ApiResponse<AdminEnterpriseDetail>;
        },
        { force: true }
      );
      if (data.success && data.item) {
        setMe(data.item);
        setForm(mapEnterpriseAccountFormFromMe(data.item));
      }
    } catch {
      // ignore
    }
  };

  /*  KIỂM TRA TRẠNG THÁI LOADING BAN ĐẦU HOẶC KHÔNG TÌM THẤY DỮ LIỆU HỒ SƠ */
  if (loading && !me) { //nếu đang tải và không có thông tin doanh nghiệp thì hiển thị loading
    return (
      <main className={styles.page}>
        <ChartStyleLoading variant="block" />
      </main>
    );
  }

  if (!me) return null; //nếu không có thông tin doanh nghiệp thì không hiển thị

  ///* KHỐI 10: XỬ LÝ ĐỊNH DẠNG ĐƯỜNG DẪN ĐỂ HIỂN THỊ LOGO CÔNG TY VÀ FILE GIẤY PHÉP */
  const m = metaRecord(me.enterpriseMeta); //lấy thông tin doanh nghiệp từ API
  const address = buildEnterpriseHeadquartersAddress(me.enterpriseMeta); //xây dựng địa chỉ doanh nghiệp

  const licName = typeof m.businessLicenseName === "string" && m.businessLicenseName.trim() ? m.businessLicenseName : "—";
  const licB64 = typeof m.businessLicenseBase64 === "string" ? m.businessLicenseBase64 : null;
  const licPublicId = enterpriseLicensePublicIdFromStored(
    typeof m.businessLicensePublicId === "string" ? m.businessLicensePublicId : null
  );
  const licHref =
    licB64 || licPublicId || (licName && licName !== "—")
      ? `/api/files/enterprise-business-license/${me.id}` //link file giấy phép kinh doanh
      : null;

  const logoMime = typeof m.companyLogoMime === "string" ? m.companyLogoMime : ""; //lấy mime type của logo
  const logoB64 = typeof m.companyLogoBase64 === "string" ? m.companyLogoBase64 : null; //lấy base64 của logo
  const logoPublicId = fromCloudinaryRef(typeof m.companyLogoPublicId === "string" ? m.companyLogoPublicId : null);
  const logoFromCloud = logoPublicId ? buildCloudinaryImageDeliveryUrl(logoPublicId) : null; //lấy logo từ cloudinary
  const logoSrc =
    logoFromCloud ?? 
    (logoB64 && logoMime.startsWith("image/") ? dataUrlFromBase64(logoMime, logoB64) : null); //lấy logo từ base64

  const statusText = formatAdminEnterpriseStatusLine(me.enterpriseStatus); //hiển thị trạng thái doanh nghiệp

  /*  CÁC NÚT ĐIỀU HƯỚNG SỰ KIỆN (BẮT ĐẦU CHỈNH SỬA / HỦY BỎ CHỈNH SỬA) */
  const startEdit = () => { //hàm xử lý bắt đầu chỉnh sửa form doanh nghiệp
    setFieldErrors({});
    setLogoError("");
    setLogoFile(null);
    setIsEditing(true);
  };

  const cancelEdit = () => { //hàm xử lý hủy chỉnh sửa form doanh nghiệp
    setForm(mapEnterpriseAccountFormFromMe(me)); //chuyển đổi thông tin doanh nghiệp thành form
    setFieldErrors({});
    setLogoError("");
    setLogoFile(null);
    setIsEditing(false);
  };

  return ( //trả về giao diện hiển thị tài khoản doanh nghiệp
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tài khoản</h1>
        <p className={styles.subtitle}>Xem toàn bộ thông tin hồ sơ. Chỉ một số trường được phép chỉnh sửa.</p>
      </header>

      {toast ? <MessagePopup open message={toast} onClose={dismissToast} /> : null}
      {error ? <MessagePopup open message={error} onClose={dismissErrorToast} /> : null}

      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
        <section className={styles.card} style={{ padding: "18px 22px" }}>
          <h2 className={styles.panelTitle}>Thông tin hồ sơ</h2>

          <EnterpriseProfileInfo
            me={me}
            address={address}
            licName={licName}
            licHref={licHref}
            logoSrc={logoSrc}
            statusText={statusText}
            hideContactFields={isEditing}
          />

          <div style={{ marginTop: 20 }}>
            <EnterpriseAccountEditSection
              isEditing={isEditing}
              saving={saving}
              form={form}
              fieldErrors={fieldErrors}
              onSetField={setField}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              provinces={provinces}
              wards={wards}
              addrLoading={addrLoading}
              logoError={logoError}
              onSetLogoFile={setLogoFile}
            />
          </div>
        </section>
      </form>
    </main>
  );
}

