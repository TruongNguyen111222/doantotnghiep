"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../home.module.css";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "#gioi-thieu", label: "Giới thiệu" },
  { href: "#su-kien", label: "Sự kiện" },
  { href: "#lien-he", label: "Liên hệ" }
];

const HOME_EVENTS = [
  {
    day: "24",
    month: "Th3",
    image: "/gioithieu.jpg",
    title:
      "TRƯỜNG ĐẠI HỌC GTVT TỔ CHỨC HỘI THẢO KHOA HỌC VỀ ĐỔI MỚI ĐÀO TẠO VÀ HỢP TÁC DOANH NGHIỆP TRONG THỰC TẬP",
    excerpt:
      "Trong hai ngày 22 và 23/03, hội thảo thu hút giảng viên, doanh nghiệp và sinh viên thảo luận về mô hình thực tập gắn với nhu cầu thị trường…"
  },
  {
    day: "23",
    month: "Th3",
    image: "/gioithieu.jpg",
    title: "HỘI ĐỒNG THẨM ĐỊNH CHƯƠNG TRÌNH ĐÀO TẠO NGÀNH KỸ THUẬT GIAO THÔNG",
    excerpt:
      "Ngày 20/03, nhà trường tổ chức phiên thẩm định với sự tham gia của các chuyên gia trong và ngoài trường, bảo đảm chất lượng đầu ra…"
  },
  {
    day: "05",
    month: "Th3",
    image: "/gioithieu.jpg",
    title: "NGÀY HỘI KẾT NỐI DOANH NGHIỆP – SINH VIÊN THỰC TẬP 2026",
    excerpt:
      "Ngày 03/03, ngày hội diễn ra tại cơ sở Cầu Giấy với hơn 50 đơn vị tuyển dụng, tạo cơ hội trao đổi trực tiếp giữa nhà tuyển dụng và sinh viên…"
  }
] as const;

export function HomeLanding() { 
  const [menuOpen, setMenuOpen] = useState(false); 
  const sectionIds = ["gioi-thieu", "su-kien", "lien-he"] as const; 
  const [activeSection, setActiveSection] = useState<(typeof sectionIds)[number] | null>(null);
  const activeIsHome = activeSection === null; 
  const closeMenu = () => setMenuOpen(false); 
  

  const goToTop = () => { 
    setActiveSection(null); 
    window.scrollTo({ top: 0, behavior: "smooth" }); 
  };

  const scrollToHash = (hash: string) => { 
    const id = hash.replace(/^#/, ""); 
    const el = document.getElementById(id); 
    if (!el) return;

    const headerEl = document.querySelector(`.${styles.header}`) as HTMLElement | null;
    const headerOffset = headerEl ? headerEl.getBoundingClientRect().height + 8 : 86; // bù chiều cao header sticky
    const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    if (sectionIds.includes(id as any)) setActiveSection(id as (typeof sectionIds)[number]);
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    const onHashChange = () => {
      if (!window.location.hash && window.location.pathname === "/") {
        goToTop();
      }
    };

    window.addEventListener("hashchange", onHashChange);

    const headerEl = document.querySelector(`.${styles.header}`) as HTMLElement | null;
    if (!headerEl) return;

    const recalc = () => {
      const headerH = headerEl.getBoundingClientRect().height;
      let bestId: (typeof sectionIds)[number] | null = null;
      let bestTop = -Infinity;

      if (window.scrollY <= headerH + 8) {
        setActiveSection(null);
        return;
      }
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= headerH + 24 && top > bestTop) {
          bestTop = top;
          bestId = id;
        }
      }

      setActiveSection((prev) => (prev === bestId ? prev : bestId));
    };

    const onScroll = () => {
      void window.requestAnimationFrame(recalc);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    recalc();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return ( 
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            href="/"
            className={styles.brand}
            onClick={(e) => {
              closeMenu();
              if (window.location.pathname === "/" && window.location.hash) {
                e.preventDefault();
                window.history.pushState(null, "", window.location.pathname);
                goToTop();
              }
            }}
          >
            <img src="/logo.png" alt="" width={44} height={44} className={styles.brandLogo} />
            <div className={styles.brandText}>
              <span className={styles.brandName}>TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI
              </span>
              <span className={styles.brandTag}>Hệ thống quản lý thực tập</span>
            </div>
          </Link>

          <nav className={styles.navDesktop} aria-label="Menu chính">
            {NAV.map((item) => (
              item.href.startsWith("#") ? (
                <a
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${activeSection === item.href.replace(/^#/, "") ? styles.navLinkActive : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHash(item.href);
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  replace={item.href.startsWith("/auth")} 
                  className={`${styles.navLink} ${item.href === "/" && activeIsHome ? styles.navLinkActive : ""}`}
                  onClick={(e) => {
                    if (item.href === "/") {
                      e.preventDefault();
                      setActiveSection(null);
                      closeMenu();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          <div className={styles.headerActions}>
            <Link href="/auth/dangnhap" replace className={styles.loginLink}> //nếu đường dẫn bắt đầu bằng /auth/ thì replace là true
              Đăng nhập
            </Link>
            <button
              type="button"
              className={styles.hamburger}
              aria-expanded={menuOpen}
              aria-controls="home-mobile-nav"
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <button
        type="button"
        className={`${styles.homeBackdrop} ${menuOpen ? styles.homeBackdropVisible : ""}`}
        aria-label="Đóng menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <aside
        id="home-mobile-nav"
        className={`${styles.navMobile} ${menuOpen ? styles.navMobileOpen : ""}`}
        aria-hidden={!menuOpen}
        aria-label="Menu mobile"
      >
        {NAV.map((item) => (
          item.href.startsWith("#") ? (
            <a
              key={item.href}
              href={item.href}
              className={`${styles.navMobileLink} ${activeSection === item.href.replace(/^#/, "") ? styles.navMobileLinkActive : ""}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToHash(item.href);
                closeMenu();
              }}
            >
              {item.label}
            </a>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              replace={item.href.startsWith("/auth")} 
              className={`${styles.navMobileLink} ${item.href === "/" && activeIsHome ? styles.navMobileLinkActive : ""}`}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          )
        ))}
        <Link href="/auth/dangnhap" replace className={styles.navMobileLink} onClick={closeMenu}>
          Đăng nhập
        </Link>
      </aside>

      <main className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <p className={styles.kicker}>Kết nối nhà trường – doanh nghiệp</p>
            <h1 className={styles.headline}>Quản lý thực tập minh bạch, hiệu quả</h1>
            <p className={styles.lead}>
              Nền tảng hỗ trợ kết nối sinh viên, giảng viên và đơn vị doanh nghiệp theo quy trình thống nhất, phù hợp mô
              hình quản lý giáo dục.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/auth/dangnhap" replace className={styles.ctaOutline}>
                Vào hệ thống
              </Link>
              <Link href="/auth/dangky" replace className={styles.ctaGhost}>
                Đăng ký doanh nghiệp
              </Link>
            </div>
          </div>
    
        </div>
      </main>

      <section id="gioi-thieu" className={styles.infoSection}>
        <div className={styles.infoInner}>
          <h2 className={styles.sectionTitle}>Giới thiệu</h2>
          <div className={styles.introLayout}>
            <div className={styles.introText}>
              <p className={styles.introParagraph}>
                Trường Đại học Giao thông vận tải có tiền thân là Trường Cao đẳng Công chính Việt Nam được khai giảng lại dưới chính quyền cách mạng ngày 15 tháng 11 năm 1945 theo Sắc lệnh của Chủ tịch Hồ Chí Minh; Nghị định thư của Bộ trưởng Quốc gia Giáo dục Vũ Đình Hòe và Bộ trưởng Bộ Giao thông công chính Đào Trọng Kim. Tháng 8/1960, Ban Xây dựng Trường Đại học Giao thông vận tải được thành lập và tuyển sinh khóa 1 trình độ Đại học. Ngày 24/03/1962, trường chính thức mang tên Trường Đại học Giao thông vận tải theo Quyết định số 42/CP ngày 24/03/1962 của Hội đồng Chính phủ. Trường Đại học Giao thông vận tải hiện có 2 cơ sở: Trụ sở chính tại số 3 phố Cầu Giấy, phường Láng, Thành phố Hà Nội; Phân hiệu tại 450-451 đường Lê Văn Việt, phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh. Trường Đại học Giao thông vận tải có sứ mạng đào tạo, nghiên cứu khoa học, chuyển giao công nghệ chất lượng cao theo xu thế hội nhập, có trách nhiệm xã hội nhằm thúc đẩy sự phát triển bền vững của ngành giao thông vận tải và đất nước. Mục tiêu của Trường Đại học Giao thông vận tải hướng tới mô hình đại học đa ngành về kỹ thuật, công nghệ và kinh tế; trở thành đại học trọng điểm, đào tạo nguồn nhân lực có trình độ cao đáp ứng nhu cầu phát triển bền vững ngành giao thông vận tải và đất nước; là trung tâm nghiên cứu khoa học có uy tín về Giao thông vận tải và một số lĩnh vực khác; có đẳng cấp trong khu vực và hội nhập Quốc tế; là địa chỉ tin cậy của người học, nhà đầu tư và toàn xã hội.
              </p>

            </div>

            <div className={styles.introImageWrap}>
              <img src="/gioithieu.jpg" alt="Giới thiệu Trường Đại học Giao thông vận tải" className={styles.introImage} />
            </div>
          </div>
        </div>
      </section>

      <section id="su-kien" className={`${styles.infoSection} ${styles.eventsSection}`}>
        <div className={styles.infoInner}>
          <h2 className={styles.sectionTitle}>Sự kiện</h2>
          <div className={styles.eventsGrid}>
            {HOME_EVENTS.map((ev, idx) => (
              <article key={`${ev.day}-${ev.month}-${idx}`} className={styles.eventCard}>
                <div className={styles.eventImageWrap}>
                  <img src={ev.image} alt="" className={styles.eventImage} />
                  <div className={styles.eventDateBadge} aria-hidden>
                    <span className={styles.eventDateDay}>{ev.day}</span>
                    <span className={styles.eventDateMonth}>{ev.month}</span>
                  </div>
                </div>
                <div className={styles.eventBody}>
                  <h3 className={styles.eventCardTitle}>{ev.title}</h3>
                  <div className={styles.eventDivider} />
                  <p className={styles.eventExcerpt}>{ev.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="lien-he" className={styles.infoSection}>
        <div className={styles.infoInner}>
          <h2 className={styles.sectionTitle}>Liên hệ</h2>
          <p className={styles.infoText}>
            Nếu bạn cần hỗ trợ, hãy gửi thông tin vào biểu mẫu. Chúng tôi sẽ cố gắng phản hồi sớm nhất.
          </p>

          <div className={styles.contactGrid}>
            <div className={styles.contactLeft}>
              <div className={styles.contactCard}>
                <div className={styles.contactCardHeader}>Văn phòng Đại học</div>
                <ul className={styles.contactList}>
                  <li className={styles.contactItem}>
                    <span>Địa chỉ: Số 3 Cầu Giấy, phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội</span>
                  </li>
                  <li className={styles.contactItem}>
                    <span>Điện thoại: (024) 3766 3311</span>
                  </li>
                  <li className={styles.contactItem}>
                    <span>Email: <a className={styles.contactInlineLink} href="mailto:vp@utc.edu.vn">vp@utc.edu.vn</a></span>
                  </li>
                </ul>
              </div>

              <div className={styles.contactCard}>
                <div className={styles.contactCardHeader}>Bộ phận Tuyển sinh – Hướng nghiệp</div>
                <ul className={styles.contactList}>
                  <li className={styles.contactItem}>
                    <span>Địa chỉ: Phòng Công tác sinh viên (CS Cầu Giấy)</span>
                  </li>
                  <li className={styles.contactItem}>
                    <span>Điện thoại: (024) 3766 3311 (máy lẻ)</span>
                  </li>
                  <li className={styles.contactItem}>
                    <span>Email: <a className={styles.contactInlineLink} href="mailto:tuyensinh@utc.edu.vn">tuyensinh@utc.edu.vn</a></span>
                  </li>
                </ul>
              </div>

              <div className={styles.contactCard}>
                <div className={styles.contactCardHeader}>Ban Hợp tác – Đối ngoại</div>
                <ul className={styles.contactList}>
                  <li className={styles.contactItem}>
                    <span>Địa chỉ: Số 3 Cầu Giấy, Cầu Giấy, Hà Nội</span>
                  </li>
                  <li className={styles.contactItem}>
                    <span>Điện thoại: (024) 3766 3311</span>
                  </li>
                  <li className={styles.contactItem}>
                    <span>Email: <a className={styles.contactInlineLink} href="mailto:htdn@utc.edu.vn">htdn@utc.edu.vn</a></span>
                  </li>
                </ul>
              </div>
            </div>

            <div className={styles.contactRight}>
              <div className={styles.contactFormCard}>
                <div className={styles.contactFormHeader}>Gửi phản hồi</div>
                <form className={styles.contactForm} onSubmit={(e) => e.preventDefault()}>
                  <label className={styles.contactField}>
                    <span className={styles.contactLabel}>Chủ đề bạn quan tâm</span>
                    <select className={styles.contactControl} defaultValue="support">
                      <option value="support">Hỗ trợ sử dụng hệ thống</option>
                      <option value="account">Tài khoản / đăng nhập</option>
                      <option value="internship">Quy trình thực tập</option>
                      <option value="other">Khác</option>
                    </select>
                  </label>

                  <label className={styles.contactField}>
                    <span className={styles.contactLabel}>Tiêu đề</span>
                    <input className={styles.contactControl} placeholder="Nhập tiêu đề" required />
                  </label>

                  <div className={styles.contactTwoCols}>
                    <label className={styles.contactField}>
                      <span className={styles.contactLabel}>Họ và tên</span>
                      <input className={styles.contactControl} placeholder="Nguyễn Văn A" required />
                    </label>
                    <label className={styles.contactField}>
                      <span className={styles.contactLabel}>Email</span>
                      <input className={styles.contactControl} placeholder="ten@domain.com" type="email" required />
                    </label>
                  </div>

                  <label className={styles.contactField}>
                    <span className={styles.contactLabel}>Điện thoại</span>
                    <input className={styles.contactControl} placeholder="0123 456 789" inputMode="tel" />
                  </label>

                  <label className={styles.contactField}>
                    <span className={styles.contactLabel}>Nội dung</span>
                    <textarea className={`${styles.contactControl} ${styles.contactTextarea}`} placeholder="Mô tả vấn đề bạn gặp..." rows={5} required />
                  </label>

                  <button type="submit" className={styles.contactSubmit}>
                    Gửi
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBar}>
          <div className={styles.footerBrand}>
          
            <div className={styles.footerBrandText}>
              <span className={styles.footerBrandMark}>UTC</span>
              <span className={styles.footerBrandNameVi}>TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI</span>
              <span className={styles.footerBrandNameEn}>UNIVERSITY OF TRANSPORT AND COMMUNICATIONS</span>
            </div>
          </div>
          <div className={styles.footerMeta}>
            <p className={styles.footerMetaLine}>Bản quyền thuộc về Trường Đại học Giao thông Vận tải</p>
            <p className={styles.footerMetaLine}>
              Địa chỉ: Số 3 Cầu Giấy, phường Dịch Vọng Hậu, Quận Cầu Giấy, Thành phố Hà Nội
            </p>
            <p className={styles.footerMetaLine}>Điện thoại: (024) 37663311</p>
          </div>
        </div>
        <div className={styles.footerStrip}>
          <p className={styles.footerStripText}>
            © {new Date().getFullYear()} Hệ thống quản lý thực tập — Trường Đại học Giao thông Vận tải.
          </p>
        </div>
      </footer>
    </div>
  );
}
