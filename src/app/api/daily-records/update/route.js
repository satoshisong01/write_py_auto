// app/api/daily-records/route.js
import db from "@/utils/db";

export async function POST(req) {
  try {
    // 요청 본문에서 데이터 추출
    const { records, api_key } = await req.json();

    // API 키 인증
    if (api_key !== process.env.API_KEY) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // records가 배열인지, 비어있지 않은지 확인
    if (!Array.isArray(records) || records.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "유효한 데이터를 입력해주세요.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 데이터베이스 트랜잭션 시작
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      for (const record of records) {
        const { username, postCount } = record;

        // 필수 필드 검증
        if (!username || typeof postCount !== "number") {
          throw new Error("Invalid data in one of the records.");
        }

        // 서울 시간 기준으로 오늘 날짜 계산
        const now = new Date();
        const seoulTime = new Date(
          now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
        );
        const today = seoulTime.toISOString().slice(0, 10); // YYYY-MM-DD 형식

        // 기존 기록 확인
        const [existingRecords] = await connection.execute(
          "SELECT id FROM daily_work_records WHERE username = ? AND work_date = ?",
          [username, today]
        );

        if (existingRecords.length > 0) {
          // 기존 기록이 있으면 업데이트
          const [updateResult] = await connection.execute(
            "UPDATE daily_work_records SET post_count = post_count + ? WHERE username = ? AND work_date = ?",
            [postCount, username, today]
          );

          if (updateResult.affectedRows === 0) {
            throw new Error(`기록 업데이트 실패 for ${username}`);
          }
        } else {
          // 기록이 없으면 새로 추가
          const [insertResult] = await connection.execute(
            "INSERT INTO daily_work_records (username, work_date, post_count) VALUES (?, ?, ?)",
            [username, today, postCount]
          );

          if (insertResult.affectedRows === 0) {
            throw new Error(`기록 추가 실패 for ${username}`);
          }
        }
      }

      await connection.commit();
      return new Response(
        JSON.stringify({
          success: true,
          message: "모든 기록이 추가/업데이트되었습니다.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      await connection.rollback();
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "데이터베이스 오류",
          error: error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "요청 처리 중 오류 발생",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
