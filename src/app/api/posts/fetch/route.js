import db from "@/utils/db"; // DB 연결

export async function GET() {
  try {
    // your_table_name에서 모든 레코드 조회 (예: id 내림차순)
    const [rows] = await db.execute(`
      SELECT *
      FROM your_table_name
      ORDER BY id DESC
    `);

    return Response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("API Fetch Error:", error);
    return Response.json(
      {
        success: false,
        message: "데이터베이스 오류",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
