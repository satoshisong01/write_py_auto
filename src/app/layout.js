import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "관리 시스템",
  description: "왼쪽 메뉴를 포함한 기본 레이아웃",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div style={{ display: "flex", height: "100vh" }}>
          {/* Sidebar */}
          <nav
            style={{
              width: "200px",
              background: "#2c3e50",
              padding: "20px",
              boxShadow: "2px 0px 5px rgba(0,0,0,0.1)",
              color: "#ecf0f1",
            }}
          >
            <ul style={{ listStyleType: "none", padding: 0 }}>
              <li style={{ marginBottom: "15px" }}>
                <Link
                  href="/keyword"
                  style={{
                    textDecoration: "none",
                    color: "#ecf0f1",
                    display: "block",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    backgroundColor: "#34495e",
                    textAlign: "center",
                  }}
                >
                  키워드
                </Link>
              </li>
              <li style={{ marginBottom: "15px" }}>
                <Link
                  href="/wordpress"
                  style={{
                    textDecoration: "none",
                    color: "#ecf0f1",
                    display: "block",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    backgroundColor: "#34495e",
                    textAlign: "center",
                  }}
                >
                  워프목록
                </Link>
              </li>
              {/* 기존 completed 메뉴 외에 새롭게 추가한 first-completed 메뉴 */}
              <li style={{ marginBottom: "15px" }}>
                <Link
                  href="/completed"
                  style={{
                    textDecoration: "none",
                    color: "#ecf0f1",
                    display: "block",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    backgroundColor: "#34495e",
                    textAlign: "center",
                  }}
                >
                  완료키워드
                </Link>
              </li>
              {/* <li style={{ marginBottom: "15px" }}>
                <Link
                  href="/first-completed"
                  style={{
                    textDecoration: "none",
                    color: "#ecf0f1",
                    display: "block",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    backgroundColor: "#34495e",
                    textAlign: "center",
                  }}
                >
                  우선 완료키워드
                </Link>
              </li> */}
              <li style={{ marginBottom: "15px" }}>
                <Link
                  href="/naver-check"
                  style={{
                    textDecoration: "none",
                    color: "#ecf0f1",
                    display: "block",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    backgroundColor: "#34495e",
                    textAlign: "center",
                  }}
                >
                  색인확인
                </Link>
              </li>
              <li style={{ marginBottom: "15px" }}>
                <Link
                  href="/prompt-status"
                  style={{
                    textDecoration: "none",
                    color: "#ecf0f1",
                    display: "block",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    backgroundColor: "#34495e",
                    textAlign: "center",
                  }}
                >
                  프롬프트 현황
                </Link>
              </li>
              <li style={{ marginBottom: "15px" }}>
                <Link
                  href="/backlink"
                  style={{
                    textDecoration: "none",
                    color: "#ecf0f1",
                    display: "block",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    backgroundColor: "#34495e",
                    textAlign: "center",
                  }}
                >
                  백링크작업 (추후)
                </Link>
              </li>
              <li style={{ marginBottom: "15px" }}>
                <Link
                  href="/start"
                  style={{
                    textDecoration: "none",
                    color: "#ecf0f1",
                    display: "block",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    backgroundColor: "#34495e",
                    textAlign: "center",
                  }}
                >
                  시작
                </Link>
              </li>
            </ul>
          </nav>

          {/* Main Content */}
          <main style={{ flex: 1, padding: "20px" }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
