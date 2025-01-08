import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { success: false, message: "Invalid prompt data" },
        { status: 400 }
      );
    }

    const scriptPath = path.resolve(process.cwd(), "src/app/scripts/gemini.js");

    // 파일 존재 여부 확인
    if (!fs.existsSync(scriptPath)) {
      return Response.json(
        { success: false, message: "gemini.js 파일이 존재하지 않습니다." },
        { status: 404 }
      );
    }

    // 파일 읽기
    let scriptContent = fs.readFileSync(scriptPath, "utf8");

    // 기존 prompt 부분을 찾는 정규식
    const promptRegex = /const prompt = `([\s\S]*?)키워드: \${keyword}\s*`;/;

    const match = scriptContent.match(promptRegex);
    if (!match) {
      return Response.json(
        { success: false, message: "기존 프롬프트 형식을 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    // `${keyword}` 부분은 유지하고, 나머지 부분만 대체
    const updatedPrompt = `const prompt = \`${prompt.trim()}\n\n키워드: \${keyword}\`;`;

    // scriptContent에서 기존 prompt 부분을 업데이트
    scriptContent = scriptContent.replace(promptRegex, updatedPrompt);

    // 파일 저장
    fs.writeFileSync(scriptPath, scriptContent);

    return Response.json({
      success: true,
      message: "Prompt updated successfully",
    });
  } catch (error) {
    console.error("Error updating prompt:", error);
    return Response.json(
      { success: false, message: "Failed to update prompt" },
      { status: 500 }
    );
  }
}
