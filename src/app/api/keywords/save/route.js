import db from "@/utils/db";

export async function POST(req) {
  try {
    const { keywords } = await req.json();
    console.log("Total Keywords Received:", keywords.length); // 키워드 개수 로그 확인

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return Response.json(
        { success: false, message: "Invalid keywords data" },
        { status: 400 }
      );
    }

    const BATCH_SIZE = 500; // 배치 크기
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);
      console.log(`Saving batch ${i / BATCH_SIZE + 1}: ${batch.length} items`);
      const values = batch.map((keyword) => [keyword]);
      const query = "INSERT IGNORE INTO keywords (keyword) VALUES ?";
      await db.query(query, [values]);
    }

    return Response.json({
      success: true,
      message: "Keywords saved successfully (duplicates ignored)",
    });
  } catch (error) {
    console.error("Error saving keywords:", error);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
