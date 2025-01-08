// app/api/daily_work_records/init.ts (혹은 .js)
import db from "@/utils/db";

export async function POST(request) {
  try {
    const { worklist } = await request.json();
    // => [{ id, username, password, link, ...}, ...]

    // 오늘 날짜 (YYYY-MM-DD 형태)
    const today = new Date().toISOString().split("T")[0];

    // worklist의 각 username에 대해,
    // 오늘 날짜로된 daily_work_records가 존재하는지 확인,
    // 없으면 post_count=0으로 INSERT
    for (const account of worklist) {
      const [rows] = await db.execute(
        "SELECT * FROM daily_work_records WHERE username = ? AND work_date = ?",
        [account.username, today]
      );

      // 존재하지 않으면 새로 insert
      if (rows.length === 0) {
        await db.execute(
          "INSERT INTO daily_work_records (username, post_count, work_date) VALUES (?, 0, ?)",
          [account.username, today]
        );
      }
    }

    return Response.json({
      success: true,
      message: "일일 작업 레코드 초기화 완료",
    });
  } catch (error) {
    console.error("init daily_work_records error", error);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
