import { Button, Section, Text } from "@react-email/components";
import { BrandedEmailLayout } from "@/emails/branded-email-layout";
import {
  ENTERPRISE_MAIL_SIGN_OFF_NAME,
  ENTERPRISE_MAIL_SIGN_OFF_SCHOOL,
  ENTERPRISE_MAIL_SIGN_OFF_TITLE,
  SCHOOL_HOTLINE
} from "@/lib/constants/school";

const primary = "#002f6c";
const danger = "#b42318";
const muted = "#64748b";

type Props = {
  greetingLine: string;
  reasons: string[];
  registerLink: string;
};

export function EnterpriseRejectedEmail(props: Props) {
  const { greetingLine, reasons, registerLink } = props; //tham số là dòng chào email, danh sách lý do và đường dẫn đăng ký
  const preview = "Kết quả đăng ký tài khoản doanh nghiệp"; //tiêu đề email

  return (
    <BrandedEmailLayout preview={preview}>
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: danger
        }}
      >
        Kết quả xét duyệt
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>Thông báo đăng ký tài khoản</Text>
      <Text style={{ margin: "0 0 14px" }}>{greetingLine}</Text>
      <Text style={{ margin: "0 0 14px" }}>
        Sau khi xem xét hồ sơ, chúng tôi rất tiếc phải thông báo yêu cầu <strong>chưa được phê duyệt</strong> tại thời điểm này.
      </Text>
      <Section
        style={{
          margin: "0 0 18px",
          borderLeft: `4px solid #fca5a5`,
          backgroundColor: "#fff1f2",
          padding: "14px 16px",
          borderRadius: "0 8px 8px 0"
        }}
      >
        <Text style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: danger, textTransform: "uppercase" }}>Lý do</Text>
        {reasons.length > 0 ? (
          reasons.map((r, i) => (
            <Text key={i} style={{ margin: "0 0 8px", fontSize: 13, color: "#450a0a", lineHeight: 1.5 }}>
              <strong>{i + 1}.</strong> {r}
            </Text>
          ))
        ) : (
          <Text style={{ margin: 0, fontSize: 13, color: muted, fontStyle: "italic" }}>
            Không nêu chi tiết lý do.
          </Text>
        )}
      </Section>
      <Text style={{ margin: "0 0 14px", fontSize: 13, color: "#334155" }}>
        Nếu lý do liên quan đến hồ sơ, vui lòng cập nhật và gửi lại qua trang đăng ký.
      </Text>
      <Section style={{ textAlign: "center", margin: "0 0 22px" }}>
        <Button
          href={registerLink}
          style={{
            backgroundColor: primary,
            borderRadius: 8,
            padding: "12px 26px",
            fontSize: 13,
            fontWeight: 700,
            color: "#ffffff",
            textDecoration: "none"
          }}
        >
          MỞ TRANG ĐĂNG KÝ
        </Button>
      </Section>
      <Text style={{ margin: "0 0 6px", fontSize: 12, color: muted, wordBreak: "break-all" }}>
        Liên kết: {registerLink}
      </Text>
      <Text style={{ margin: "20px 0 0", fontSize: 13, color: "#0f172a" }}>Trân trọng,</Text>
      <Text style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.65, color: "#334155" }}>
        <strong style={{ color: primary }}>{ENTERPRISE_MAIL_SIGN_OFF_NAME}</strong>
        <br />
        <em>{ENTERPRISE_MAIL_SIGN_OFF_TITLE}</em>
        <br />
        <strong>{ENTERPRISE_MAIL_SIGN_OFF_SCHOOL}</strong>
        <br />
        <span style={{ color: muted }}>ĐT: {SCHOOL_HOTLINE}</span>
      </Text>
    </BrandedEmailLayout>
  );
}

export default EnterpriseRejectedEmail;
