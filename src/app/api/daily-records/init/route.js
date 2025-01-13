// app/api/daily_work_records/init.js
import db from "@/utils/db";

// KST 날짜(YYYY-MM-DD) 문자열을 만드는 헬퍼 함수
function getKSTDateString() {
  const now = new Date();
  // 현재 시각(로컬기준)을 UTC 시각(ms)으로 환산
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  // UTC+9 → 한국(서울) 시간
  const kstMs = utcMs + 9 * 60 * 60000;

  const kstDate = new Date(kstMs);

  // "YYYY-MM-DD" 형식으로 포맷
  const yyyy = kstDate.getFullYear();
  const mm = String(kstDate.getMonth() + 1).padStart(2, "0");
  const dd = String(kstDate.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(request) {
  try {
    const { worklist } = await request.json();
    // worklist는 [{ username, ...}, ...] 형태라고 가정

    // KST 기준 "YYYY-MM-DD"
    const today = getKSTDateString();

    // worklist 내 각 username에 대해,
    // 오늘 날짜(work_date = today)의 daily_work_records 레코드가 없으면 post_count=0으로 삽입
    for (const account of worklist) {
      const [rows] = await db.execute(
        "SELECT * FROM daily_work_records WHERE username = ? AND work_date = ?",
        [account.username, today]
      );

      if (rows.length === 0) {
        await db.execute(
          "INSERT INTO daily_work_records (username, post_count, work_date) VALUES (?, 0, ?)",
          [account.username, today]
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "일일 작업 레코드 초기화 완료",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("init daily_work_records error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Database error",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
