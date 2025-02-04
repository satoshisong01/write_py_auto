import db from "@/utils/db";

export async function POST(req) {
  try {
    const { keywords } = await req.json();
    console.log("Total Keywords Received:", keywords.length);

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
      // 각 항목은 [keyword, first_keyword] 형태의 배열로 생성
      const values = batch.map((item) => [item.keyword, item.first_keyword]);
      const query =
        "INSERT IGNORE INTO keywords (keyword, first_keyword) VALUES ?";
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
