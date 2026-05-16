import { Button, Section, Text } from "@react-email/components";
import { BrandedEmailLayout } from "@/emails/branded-email-layout"; //gọi layout/template email nhét vào children
import { MAIL_PRODUCT_NAME, SCHOOL_FULL_NAME, SCHOOL_HOTLINE } from "@/lib/constants/school"; //gọi tên trường và email hỗ trợ

const primary = "#002f6c";
const danger = "#b42318";
const muted = "#64748b";

type Props = { //kiểu dữ liệu cho component PasswordResetEmail
  fullName: string;
  youLabel: string;
  resetUrl: string;
};

export function PasswordResetEmail(props: Props) { //hàm render ra component PasswordResetEmail
  const { fullName, youLabel, resetUrl } = props; //lấy dữ liệu từ props
  const preview = `Đặt lại mật khẩu — ${SCHOOL_FULL_NAME}`; //tiêu đề email

  return (
    <BrandedEmailLayout preview={preview}> 
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: primary
        }}
      >
        Đặt lại mật khẩu
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>Xác nhận yêu cầu của bạn</Text>
      <Text style={{ margin: "0 0 14px" }}>
        Kính gửi <strong>{fullName}</strong>,
      </Text>
      <Text style={{ margin: "0 0 14px" }}>
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này trên <strong>{MAIL_PRODUCT_NAME}</strong> — <strong>{SCHOOL_FULL_NAME}</strong>.
      </Text>
      <Text style={{ margin: "0 0 22px" }}>
        Để tiếp tục, <strong>{youLabel}</strong> vui lòng nhấn nút bên dưới (liên kết hết hạn sau <strong>15 phút</strong>).
      </Text>
      <Section style={{ textAlign: "center", margin: "0 0 24px" }}>
        <Button
          href={resetUrl}
          style={{
            backgroundColor: primary,
            borderRadius: 8,
            padding: "14px 32px",
            fontSize: 14,
            fontWeight: 700,
            color: "#ffffff",
            textDecoration: "none",
            letterSpacing: "0.04em"
          }}
        >
          ĐẶT LẠI MẬT KHẨU
        </Button>
      </Section>
      <Section
        style={{
          margin: "0 0 20px",
          borderLeft: `4px solid ${danger}`,
          backgroundColor: "#fff1f2",
          padding: "14px 16px",
          borderRadius: "0 8px 8px 0"
        }}
      >
        <Text style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: danger, textTransform: "uppercase" }}>Lưu ý bảo mật</Text>
        <Text style={{ margin: "0 0 8px", fontSize: 13, color: "#450a0a", lineHeight: 1.55 }}>
          • Không chia sẻ email hoặc liên kết này cho bất kỳ ai.
          <br />• Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua — mật khẩu hiện tại không đổi.
        </Text>
      </Section>
      <Text style={{ margin: "0 0 12px", fontSize: 13, color: muted }}>
        Hỗ trợ: <strong style={{ color: primary }}>{SCHOOL_HOTLINE}</strong>
      </Text>
      <Text style={{ margin: 0, fontSize: 12, color: muted, lineHeight: 1.55 }}>
        Nếu nút không hoạt động, dán liên kết sau vào trình duyệt:
        <br />
        <span style={{ wordBreak: "break-all", color: "#475569" }}>{resetUrl}</span>
      </Text>
    </BrandedEmailLayout>
  );
}

export default PasswordResetEmail;
