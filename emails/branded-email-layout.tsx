//layout/template email dùng chung cho toàn hệ thống.
import { Body, Container, Head, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import {
  DEFAULT_SUPPORT_EMAIL,
  ENTERPRISE_MAIL_SIGN_OFF_ADDRESS,
  MAIL_PRODUCT_NAME,
  SCHOOL_FULL_NAME,
  SCHOOL_HOTLINE,
  SCHOOL_WEBSITE
} from "@/lib/constants/school";
import { MAIL_BRAND as B } from "@/lib/mail-brand";

const font = "Arial, Helvetica, sans-serif";

type Props = {
  preview: string;
  children: ReactNode;
};

export function BrandedEmailLayout({ preview, children }: Props) {
  return (
    <Html lang="vi">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: B.pageBg,
          fontFamily: font,
          color: B.bodyText,
          colorScheme: "light"
        }}
      >
        <Section style={{ padding: 0 }}>
          <Container
            style={{
              maxWidth: B.innerWidth,
              width: "100%",
              margin: "0 auto",
              backgroundColor: B.bodyBg
            }}
          >
            <Section
              style={{
                backgroundColor: B.headerBar,
                color: B.headerText,
                padding: "18px 24px",
                fontFamily: font
              }}
            >
              <Text style={{ margin: 0, fontSize: 16, fontWeight: "bold", lineHeight: "1.35", color: B.headerText }}>
                {SCHOOL_FULL_NAME}
              </Text>
              <Text style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "1.4", color: B.headerText }}>
                {MAIL_PRODUCT_NAME}
              </Text>
            </Section>
            <Section
              style={{
                padding: "10px 24px 20px",
                fontSize: 14,
                lineHeight: "1.6",
                color: B.bodyText,
                fontFamily: font,
                textAlign: "justify",
                wordBreak: "break-word"
              }}
            >
              {children}
            </Section>
            <Section
              style={{
                padding: "16px 24px",
                fontSize: 13,
                color: B.footerText,
                fontFamily: font,
                lineHeight: "1.65",
                textAlign: "justify",
                wordBreak: "break-word"
              }}
            >
              <Text style={{ margin: "0 0 6px", fontWeight: "bold", color: B.footerHeading, fontSize: 13 }}>
                Thông tin liên hệ
              </Text>
              <Text style={{ margin: 0, fontSize: 13, color: B.footerText, lineHeight: "1.65" }}>
                Địa chỉ: {ENTERPRISE_MAIL_SIGN_OFF_ADDRESS}
                <br />
                Điện thoại: {SCHOOL_HOTLINE}
                <br />
                Email:{" "}
                <Link href={`mailto:${DEFAULT_SUPPORT_EMAIL}`} style={{ color: B.link, fontWeight: "bold", textDecoration: "underline" }}>
                  {DEFAULT_SUPPORT_EMAIL}
                </Link>
                <br />
                Website:{" "}
                <Link href={SCHOOL_WEBSITE} style={{ color: B.link, fontWeight: "bold", textDecoration: "underline" }}>
                  {SCHOOL_WEBSITE}
                </Link>
              </Text>
              <Text style={{ margin: "12px 0 0", fontSize: 12, color: B.footerMuted, lineHeight: "1.55" }}>
                Thư được gửi tự động từ {MAIL_PRODUCT_NAME}. Vui lòng không phản hồi trực tiếp email này.
              </Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}
