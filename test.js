const puppeteer = require("puppeteer");

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false, // 브라우저를 표시하기 위해 false로 설정
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    });

    const page = await browser.newPage();
    await page.goto("https://www.google.com", { waitUntil: "networkidle2" });
    console.log("✅ 브라우저가 성공적으로 열렸습니다.");

    // 브라우저를 닫지 않고 유지
    // await browser.close();
  } catch (error) {
    console.error("❌ 브라우저 실행 중 에러 발생:", error);
  }
})();
