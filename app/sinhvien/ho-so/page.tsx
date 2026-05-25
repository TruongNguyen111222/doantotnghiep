"use client";

import { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css";
import adminStyles from "../../admin/styles/dashboard.module.css";
import MessagePopup from "../../components/MessagePopup";
import { getCachedValue, getOrFetchCached, hasCachedValue } from "@/lib/utils/client-query-cache";
import type { Province, SinhVienHoSoDraft, SinhVienHoSoProfile, Ward } from "@/lib/types/sinhvien-ho-so";
import {
  SINHVIEN_HO_SO_LOAD_PROFILE_ERROR_DEFAULT,
  SINHVIEN_HO_SO_PROFILE_ENDPOINT,
  SINHVIEN_HO_SO_SUBMIT_ERROR_DEFAULT
} from "@/lib/constants/sinhvien-ho-so";
import {
  buildSinhVienHoSoPatchPayload,
  getSinhVienHoSoSubmitErrorMessage,
  getSinhVienHoSoSubmitSuccessMessage,
  isCvMimeAllowed,
  mapProfileToDraft,
  validateSinhVienHoSoDraft
} from "@/lib/utils/sinhvien-ho-so";
import SinhVienProfileEditSection from "./components/SinhVienProfileEditSection";
import { ChartStyleLoading } from "@/app/components/ChartStyleLoading";

const PROFILE_CACHE_KEY = "sinhvien:ho-so:profile";
const PROVINCES_CACHE_KEY = "vn-address:provinces";

type ProfilePayload = { success: boolean; item?: SinhVienHoSoProfile | null; message?: string };

function readCachedProfileItem(): SinhVienHoSoProfile | null { //hàm lấy thông tin hồ sơ sinh viên từ cache
  if (typeof window === "undefined") return null;
  const d = getCachedValue<ProfilePayload>(PROFILE_CACHE_KEY);
  return (d?.item ?? null) as SinhVienHoSoProfile | null;
}
 
async function fetchProfilePayload(): Promise<ProfilePayload> { //hàm lấy thông tin hồ sơ sinh viên từ API
  const res = await fetch(SINHVIEN_HO_SO_PROFILE_ENDPOINT);
  const data = (await res.json()) as ProfilePayload;
  if (!res.ok || !data?.success) throw new Error(data?.message || SINHVIEN_HO_SO_LOAD_PROFILE_ERROR_DEFAULT);
  return data;
}
 
export default function SinhVienHoSoPage() { //trang hồ sơ sinh viên
  const [toast, setToast] = useState("");
  //state loading, error, profile, provinces, wards, wardLoading
  const [profileLoading, setProfileLoading] = useState(() =>
    typeof window === "undefined" ? true : !hasCachedValue(PROFILE_CACHE_KEY)
  );
  const [profileError, setProfileError] = useState("");
  const [profile, setProfile] = useState<SinhVienHoSoProfile | null>(() => readCachedProfileItem());

  const initialDraft = mapProfileToDraft(readCachedProfileItem());
  const [phone, setPhone] = useState(() => initialDraft.phone);
  const [email, setEmail] = useState(() => initialDraft.email);
  const [currentProvinceCode, setCurrentProvinceCode] = useState(() => initialDraft.currentProvinceCode);
  const [currentWardCode, setCurrentWardCode] = useState(() => initialDraft.currentWardCode);
  const [intro, setIntro] = useState(() => initialDraft.intro);
  const [cvFileName, setCvFileName] = useState<string | null>(() => initialDraft.cvFileName);
  const [cvMime, setCvMime] = useState<string | null>(() => initialDraft.cvMime);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [removeCv, setRemoveCv] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardLoading, setWardLoading] = useState(false);

  const syncDraftFromProfile = (p: SinhVienHoSoProfile | null) => { //hàm đồng bộ thông tin hồ sơ sinh viên từ profile sang draft
    const draft = mapProfileToDraft(p);
    setPhone(draft.phone);
    setEmail(draft.email);
    setCurrentProvinceCode(draft.currentProvinceCode);
    setCurrentWardCode(draft.currentWardCode);
    setIntro(draft.intro);
    setCvFileName(draft.cvFileName);
    setCvMime(draft.cvMime);
    setCvFile(null);
    setRemoveCv(false);
    setFieldErrors({});
  };

  useEffect(() => { //hàm tải dữ liệu hồ sơ sinh viên
    void (async () => {
      try {
        if (!hasCachedValue(PROFILE_CACHE_KEY)) setProfileLoading(true);
        setProfileError("");
        const data = await getOrFetchCached<ProfilePayload>(PROFILE_CACHE_KEY, fetchProfilePayload);
        setProfile((data.item ?? null) as SinhVienHoSoProfile | null);
        syncDraftFromProfile((data.item ?? null) as SinhVienHoSoProfile | null);
      } catch (e: any) {
        setProfileError(e?.message || SINHVIEN_HO_SO_LOAD_PROFILE_ERROR_DEFAULT);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  useEffect(() => { //hàm poll nền tải dữ liệu hồ sơ sinh viên mỗi 30 giây
    const timer = setInterval(() => {
      if (isEditing || saving) return;
      void (async () => {
        try {
          const data = await getOrFetchCached<ProfilePayload>(PROFILE_CACHE_KEY, fetchProfilePayload, { force: true });
          setProfile((data.item ?? null) as SinhVienHoSoProfile | null);
          syncDraftFromProfile((data.item ?? null) as SinhVienHoSoProfile | null);
        } catch {
          /* bỏ qua lỗi khi poll nền */
        }
      })();
    }, 30000);
    return () => clearInterval(timer);
  }, [isEditing, saving]);

  useEffect(() => { //hàm tải dữ liệu tỉnh/thành
    void (async () => {
      try {
        const items = await getOrFetchCached<Province[]>(PROVINCES_CACHE_KEY, async () => {
          const res = await fetch("/api/vn-address/provinces");
          const data = await res.json();
          if (!res.ok || !Array.isArray(data?.items)) throw new Error("Không tải được danh sách tỉnh/thành.");
          return data.items as Province[];
        });
        setProvinces(items);
      } catch {
        setProvinces([]);
      }
    })();
  }, []);

  useEffect(() => { //hàm tải dữ liệu phường/xã
    if (!currentProvinceCode) {
      setWards([]);
      setCurrentWardCode("");
      return;
    }
    const wardsKey = `vn-address:wards:${currentProvinceCode}`;
    setWardLoading(true);
    void getOrFetchCached<Ward[]>(wardsKey, async () => {
      const r = await fetch(`/api/vn-address/provinces/${currentProvinceCode}/wards`);
      const data = await r.json();
      if (!Array.isArray(data?.items)) throw new Error("Không tải được phường/xã.");
      return data.items as Ward[];
    })
      .then((items) => setWards(items))
      .catch(() => setWards([]))
      .finally(() => setWardLoading(false));
  }, [currentProvinceCode]);

  const validateProfile = () => {
    const draft: SinhVienHoSoDraft = {
      phone,
      email,
      currentProvinceCode,
      currentWardCode,
      intro,
      cvFileName,
      cvMime,
      cvFile
    };
    const { isValid, errors } = validateSinhVienHoSoDraft(draft);
    setFieldErrors(errors);
    return isValid;
  };

  const onPickCv = async (file: File | null) => { //hàm chọn file CV
    if (!file) return;
    const mime = file.type || "";
    if (!isCvMimeAllowed(mime)) {
      setFieldErrors((p) => ({ ...p, cv: "File CV không hợp lệ. Chỉ hỗ trợ .pdf, .doc, .docx." }));
      return;
    }
    setCvFileName(file.name);
    setCvMime(mime);
    setCvFile(file);
    setRemoveCv(false);
    setFieldErrors((p) => ({ ...p, cv: "" }));
  };

  const submitProfile = async () => { //hàm cập nhật hồ sơ sinh viên
    if (!isEditing) return;
    if (!validateProfile()) return;
    setSaving(true);
    try {
      const payload = buildSinhVienHoSoPatchPayload({ //tạo payload để cập nhật hồ sơ sinh viên
        phone,
        email,
        currentProvinceCode,
        currentWardCode,
        intro,
        cvFileName,
        cvMime,
        cvFile
      } as any);
      const fd = new FormData();
      fd.set("phone", payload.phone);
      fd.set("email", payload.email);
      fd.set("currentProvinceCode", payload.currentProvinceCode);
      fd.set("currentWardCode", payload.currentWardCode);
      fd.set("intro", payload.intro);
      if (cvFile) fd.set("cv", cvFile);
      if (removeCv) fd.set("removeCv", "1");

      const res = await fetch(SINHVIEN_HO_SO_PROFILE_ENDPOINT, { method: "PATCH", body: fd }); //gửi request cập nhật hồ sơ sinh viên từ API
      const data = await res.json();
      if (!res.ok || !data?.success) {
        if (data?.errors) setFieldErrors(data.errors);
        throw new Error(data?.message || SINHVIEN_HO_SO_SUBMIT_ERROR_DEFAULT);
      }
      setToast(getSinhVienHoSoSubmitSuccessMessage({ message: data?.message }));
      const refData = await getOrFetchCached<ProfilePayload>(PROFILE_CACHE_KEY, fetchProfilePayload, { force: true });
      setProfile((refData.item ?? null) as SinhVienHoSoProfile | null);
      syncDraftFromProfile((refData.item ?? null) as SinhVienHoSoProfile | null);
      setIsEditing(false);
    } catch (e: any) {
      setToast(e?.message || getSinhVienHoSoSubmitErrorMessage({ message: e?.message }));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => { //hàm bắt đầu chỉnh sửa hồ sơ sinh viên
    setFieldErrors({});
    setIsEditing(true);
  };

  const cancelEdit = () => { //hàm hủy chỉnh sửa hồ sơ sinh viên
    syncDraftFromProfile(profile);
    setIsEditing(false);
  };

  return ( //render trang hồ sơ sinh viên
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Hồ sơ cá nhân</h1>
      </header>

      {profileLoading ? <ChartStyleLoading variant="block" /> : null}
      {profileError ? <p className={adminStyles.error}>{profileError}</p> : null}

      {!profileLoading && profile ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitProfile();
          }}
          noValidate
        >
          <section className={styles.card} style={{ padding: "18px 22px" }}>
            <h2 className={styles.panelTitle}>Hồ sơ sinh viên</h2>
            <SinhVienProfileEditSection
              isEditing={isEditing}
              saving={saving}
              profile={profile}
              phone={phone}
              email={email}
              currentProvinceCode={currentProvinceCode}
              currentWardCode={currentWardCode}
              intro={intro}
              cvFileName={cvFileName}
              cvMime={cvMime}
              provinces={provinces}
              wards={wards}
              wardLoading={wardLoading}
              fieldErrors={fieldErrors}
              onPhoneChange={setPhone}
              onEmailChange={setEmail}
              onProvinceCodeChange={setCurrentProvinceCode}
              onWardCodeChange={setCurrentWardCode}
              onIntroChange={setIntro}
              onPickCv={(f) => void onPickCv(f)}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
            />
          </section>
        </form>
      ) : null}

      {toast ? (
        <MessagePopup
          open
          title="Thông báo"
          onClose={() => setToast("")}
          actions={
            <button type="button" className={`${adminStyles.btn} ${adminStyles.btnPrimary}`} onClick={() => setToast("")}>
              Đóng
            </button>
          }
        >
          {toast}
        </MessagePopup>
      ) : null}
    </main>
  );
}
