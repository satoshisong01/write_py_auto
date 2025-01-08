const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

/**
 * Gemini API를 통해 콘텐츠 생성
 * @param {string} keyword 생성할 콘텐츠의 키워드
 * @param {string} apiKey 사용할 Gemini API 키
 * @returns {Object} 생성된 콘텐츠 (title, content)
 */
const generateGeminiContent = async (keyword, apiKey) => {
  if (!apiKey) {
    throw new Error("Gemini API 키가 제공되지 않았습니다.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `
1. 이 키워드로 네이버 포털에서 사용자들의 클릭률이 높은 제목을 만들어주는데, 
사용자 의도를 반영하고 흥미를 끌 수 있는 제목을 니가 판단하기에 가장 적합한 제목 하나를 제목: ooo 이러한 형식으로 만들어줘.

2. 제목에 맞는 워드프레스 글을 자세하게 작성해주는데, h1/h2등을 나눠서 작성해주고 글 위에 목차를 만들어주고, 
최대한 네이버 SEO에 맞는 글을 작성해줘. 이때 작성하는 글은 HTML로 작성해줘. 
메타디스크립션 등 SEO에 필요한 요소를 다 포함해서 작성해줘, 내용은 풍부할수록 좋아.

3. h2 태그는 숫자를 제외하고, 소제목 형태로 표현되도록 해줘. 예: 'A. 키워드'처럼 만들어줘.

키워드: ${keyword}
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 제목 및 콘텐츠 분리
    const titleMatch = text.match(/제목:\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : "제목 없음";
    const content = text.replace(/제목:\s*(.+)/, "").trim();

    return { title, content };
  } catch (error) {
    console.error("Gemini API 호출 중 에러 발생:", error);
    return null;
  }
};

module.exports = { generateGeminiContent };
