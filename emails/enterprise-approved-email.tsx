
//template email duyệt doanh nghiệp — viết bằng React component thay vì HTML thủ công. 
import { Button, Link, Section, Text } from "@react-email/components";
import { BrandedEmailLayout } from "@/emails/branded-email-layout";
import {
  DEFAULT_SUPPORT_EMAIL,
  ENTERPRISE_MAIL_SIGN_OFF_ADDRESS,
  ENTERPRISE_MAIL_SIGN_OFF_NAME,
  ENTERPRISE_MAIL_SIGN_OFF_SCHOOL,
  ENTERPRISE_MAIL_SIGN_OFF_TITLE,
  SCHOOL_HOTLINE
} from "@/lib/constants/school";

const primary = "#002f6c";
const success = "#027a48";
const muted = "#64748b";

type Props = {
  greetingLine: string; //dòng chào email
  loginPath: string; //đường dẫn đăng nhập
  loginEmail: string; //email đăng nhập
};

export function EnterpriseApprovedEmail(props: Props) {
  const { greetingLine, loginPath, loginEmail } = props;
  const preview = "Phê duyệt tài khoản doanh nghiệp — đăng nhập hệ thống thực tập";

  return (
    <BrandedEmailLayout preview={preview}>
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: success
        }}
      >
        Phê duyệt thành công
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>Thông báo kết nối thực tập</Text>
      <Text style={{ margin: "0 0 14px" }}>{greetingLine}</Text>
      <Text style={{ margin: "0 0 16px" }}>
        Hồ sơ đăng ký tham gia hệ thống <strong>Quản lý thực tập</strong> đã được <strong style={{ color: success }}>phê duyệt</strong>. Quý doanh nghiệp có thể đăng nhập để đăng tin, quản lý ứng tuyển và theo dõi thực tập.
      </Text>
      <Section style={{ backgroundColor: "#f0f9ff", borderRadius: 10, padding: "18px 18px", margin: "0 0 20px", border: "1px solid #bae6fd" }}>
        <Text style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: primary, textTransform: "uppercase" }}>Thông tin đăng nhập</Text>
        <Text style={{ margin: "0 0 6px", fontSize: 13, color: muted }}>
          Địa chỉ hệ thống:{" "}
          <Link href={loginPath} style={{ color: primary, fontWeight: 600 }}>
            {loginPath}
          </Link>
        </Text>
        <Text style={{ margin: "0 0 6px", fontSize: 13, color: "#0f172a" }}>
          Tên đăng nhập: <strong>{loginEmail}</strong>
        </Text>
        <Text style={{ margin: 0, fontSize: 13, color: "#0f172a" }}>
          Mật khẩu tạm thời: <strong>mã số thuế</strong> đã đăng ký (dùng đúng MST lần đầu).
        </Text>
      </Section>
      <Section
        style={{
          margin: "0 0 22px",
          borderLeft: `4px solid #f59e0b`,
          backgroundColor: "#fffbeb",
          padding: "14px 16px",
          borderRadius: "0 8px 8px 0"
        }}
      >
        <Text style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Lưu ý</Text>
        <Text style={{ margin: 0, fontSize: 13, color: "#422006", lineHeight: 1.55 }}>
          Đổi mật khẩu ngay trong lần đăng nhập đầu tiên. Cập nhật đầy đủ hồ sơ và vị trí tuyển dụng để sinh viên ứng tuyển.
        </Text>
      </Section>
      <Section style={{ textAlign: "center", margin: "0 0 20px" }}>
        <Button
          href={loginPath}
          style={{
            backgroundColor: primary,
            borderRadius: 8,
            padding: "14px 28px",
            fontSize: 14,
            fontWeight: 700,
            color: "#ffffff",
            textDecoration: "none"
          }}
        >
          ĐĂNG NHẬP HỆ THỐNG
        </Button>
      </Section>
      <Text style={{ margin: "0 0 6px", fontSize: 13, color: muted }}>
        Hỗ trợ: <Link href={`mailto:${DEFAULT_SUPPORT_EMAIL}`}>{DEFAULT_SUPPORT_EMAIL}</Link> · <strong>{SCHOOL_HOTLINE}</strong>
      </Text>
      <Text style={{ margin: "20px 0 0", fontSize: 13, color: "#0f172a" }}>Trân trọng,</Text>
      <Text style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.65, color: "#334155" }}>
        <strong style={{ color: primary }}>{ENTERPRISE_MAIL_SIGN_OFF_NAME}</strong>
        <br />
        <em>{ENTERPRISE_MAIL_SIGN_OFF_TITLE}</em>
        <br />
        <strong>{ENTERPRISE_MAIL_SIGN_OFF_SCHOOL}</strong>
        <br />
        <span style={{ color: muted, fontSize: 12 }}>{ENTERPRISE_MAIL_SIGN_OFF_ADDRESS}</span>
      </Text>
    </BrandedEmailLayout>
  );
}

export default EnterpriseApprovedEmail;
