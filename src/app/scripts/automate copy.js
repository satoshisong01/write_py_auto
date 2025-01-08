const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();
const axios = require("axios");
const axiosRetry = require("axios-retry"); // 재시도 라이브러리 (버전 2.x 사용)
const { generateGeminiContent } = require("./gemini");
const pLimit = require("p-limit"); // 동시성 제한을 위한 라이브러리 (버전 2.x 사용)

// Axios 재시도 설정
axiosRetry(axios, {
  retries: 3, // 최대 재시도 횟수
  retryDelay: (retryCount) => {
    return retryCount * 1000; // 재시도 간 대기 시간 (밀리초)
  },
  retryCondition: (error) => {
    return error.response && error.response.status === 429; // 429 오류일 때만 재시도
  },
});

// sleep 함수 정의
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 콘텐츠 필터링 함수
const filterContent = (content) => {
  return content
    .replace(/## 1\.[\s\S]*?## 2\. 워드프레스 글 \(HTML\)\n\n```html/, "") // ## 1, ## 2, ```html 제거
    .replace(/\n{15,}/g, "\n\n") // 연속 공백 줄 제거
    .replace(/```\n*$/, "") // 마지막 ``` 및 뒤따르는 공백 제거
    .replace(/\*\*참고:\*[\s\S]*$/, "") // 참고 항목 제거
    .trim();
};

const apiBaseUrl = "http://localhost:3000"; // 서버 URL

// keyword_end를 업데이트하는 함수
const updateKeywordEnd = async (keyword) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/api/keywords/update`, {
      keyword: keyword,
    });

    if (response.data.success) {
      console.log(
        `[API] 키워드 ID "${keyword}"의 keyword_end가 1로 업데이트되었습니다.`
      );
    } else {
      console.error(`[API] 키워드 업데이트 실패: ${response.data.message}`);
    }
  } catch (error) {
    console.error(`[API] 키워드 업데이트 에러:`, error.message);
  }
};

// 단일 계정을 처리하는 함수
const processAccount = async (
  account,
  assignedKeywords,
  browser,
  keywordLimit
) => {
  const { username, password, link } = account;
  console.log(`\n### 워프 작업 시작: ${username} ###`);

  // 계정당 병렬 처리할 키워드의 동시성 제한
  const limit = pLimit(keywordLimit);

  // 각 키워드에 대한 작업 정의
  const keywordPromises = assignedKeywords.map((keyword) =>
    limit(async () => {
      const sanitizedKeyword = keyword
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const outputFile = `post_content_${sanitizedKeyword}.json`;

      const page = await browser.newPage();

      try {
        console.log(`\n### [${username}] 키워드: ${keyword} ###`);

        // Gemini API로 콘텐츠 생성
        console.log(`[${username}][${keyword}] Gemini API로 콘텐츠 생성 중...`);
        const postData = await generateGeminiContent(keyword);

        if (!postData || !postData.title || !postData.content) {
          throw new Error(`[${keyword}] 제목 또는 콘텐츠 생성 실패`);
        }

        const filteredContent = filterContent(postData.content);

        // 생성된 콘텐츠를 JSON 파일로 저장
        await fs.writeFile(
          outputFile,
          JSON.stringify({ ...postData, content: filteredContent }, null, 4),
          "utf-8"
        );
        console.log(
          `[${username}][${keyword}] 콘텐츠가 '${outputFile}'에 저장되었습니다.`
        );

        // 프롬프트 및 응답을 텍스트 파일에 저장
        const promptResponseFilePath = path.resolve(
          __dirname,
          "prompts_and_responses.txt"
        );
        const promptResponseContent = `\n=== Keyword: ${keyword} ===\n${JSON.stringify(
          postData,
          null,
          2
        )}\n`;
        await fs.appendFile(
          promptResponseFilePath,
          promptResponseContent,
          "utf-8"
        );
        console.log(
          `[${username}][${keyword}] 프롬프트 및 응답을 '${promptResponseFilePath}'에 저장하였습니다.`
        );

        const { title } = postData;

        console.log(`### [${username}][${keyword}] 제목: ${title} ###`);
        console.log(
          `### [${username}][${keyword}] 필터링된 콘텐츠: ${filteredContent.substring(
            0,
            100
          )}... ###`
        );

        // 워드프레스 새 글 작성 페이지로 이동
        const postNewUrl = link;
        await page.goto(postNewUrl, { waitUntil: "networkidle2" });

        // 현재 URL이 로그인 페이지인지 확인
        if (page.url().includes("wp-login.php")) {
          console.log(
            `[${username}][${keyword}] 로그인 페이지로 이동 중입니다...`
          );

          // .env 파일 대신 account 객체에서 직접 가져옴
          const WP_USERNAME = username;
          const WP_PASSWORD = password;

          if (!WP_USERNAME || !WP_PASSWORD) {
            throw new Error(
              `[${username}][${keyword}] 계정 정보가 누락되었습니다.`
            );
          }

          // 아이디와 비밀번호 입력
          const usernameSelector = "#user_login";
          const passwordSelector = "#user_pass";
          const loginButtonSelector = "#wp-submit";

          await page.waitForSelector(usernameSelector, { visible: true });
          await page.type(usernameSelector, WP_USERNAME, { delay: 100 });

          // 아이디 입력 후 0.5초 대기
          await sleep(500);

          await page.waitForSelector(passwordSelector, { visible: true });
          await page.type(passwordSelector, WP_PASSWORD, { delay: 100 });

          // 비밀번호 입력 후 0.5초 대기
          await sleep(500);

          await page.click(loginButtonSelector);

          // 로그인 후 새 글 작성 페이지로 이동
          await page.waitForNavigation({ waitUntil: "networkidle2" });
          await page.goto(postNewUrl, { waitUntil: "networkidle2" });
        }

        console.log(
          `[${username}][${keyword}] 로그인 완료 및 새 글 작성 페이지로 이동했습니다.`
        );

        // 옵션 버튼 클릭 (3점 메뉴)
        const optionsButtonSelector = 'button[aria-label="옵션"]';
        await page.waitForSelector(optionsButtonSelector, { visible: true });
        await page.click(optionsButtonSelector);
        console.log(`[${username}][${keyword}] 옵션 버튼 클릭 완료`);

        // "코드 편집기" 버튼 선택
        const menuItemsSelector =
          'button[role="menuitemradio"] span.components-menu-item__item';
        await page.waitForSelector(menuItemsSelector, { visible: true });

        const menuItems = await page.$$(menuItemsSelector);
        let codeEditorButtonHandle = null;

        for (const item of menuItems) {
          const text = await page.evaluate((el) => el.textContent.trim(), item);
          if (text === "코드 편집기") {
            codeEditorButtonHandle = await item.evaluateHandle((el) =>
              el.closest('button[role="menuitemradio"]')
            );
            break;
          }
        }

        if (!codeEditorButtonHandle) {
          throw new Error(
            `[${username}][${keyword}] 코드 편집기 버튼을 찾을 수 없습니다.`
          );
        }

        await codeEditorButtonHandle.click();
        console.log(`[${username}][${keyword}] 코드 편집기 전환 완료`);

        // 코드 편집기 로딩 대기
        await sleep(1000);

        // 옵션 창 닫기
        await page.click(optionsButtonSelector);
        console.log(`[${username}][${keyword}] 옵션 창 닫기 완료`);

        // 일반 편집 모드로 복귀
        const exitCodeEditorButtonSelector = "button.is-tertiary";
        await page.waitForSelector(exitCodeEditorButtonSelector, {
          visible: true,
        });
        await page.click(exitCodeEditorButtonSelector);
        console.log(`[${username}][${keyword}] 일반 편집 모드로 전환 완료`);

        // 제목 입력
        const titleSelector = "textarea#inspector-textarea-control-0";
        await page.waitForSelector(titleSelector, { visible: true });
        await page.type(titleSelector, title, { delay: 100 });

        // 콘텐츠 입력
        const contentSelector = "textarea#post-content-0";
        await page.waitForSelector(contentSelector, { visible: true });
        await page.focus(contentSelector);
        await page.evaluate(
          (selector, value) => {
            const textarea = document.querySelector(selector);
            if (textarea) {
              textarea.value = value;
              textarea.dispatchEvent(new Event("input", { bubbles: true }));
            }
          },
          contentSelector,
          filteredContent
        );

        await page.type(contentSelector, ".", { delay: 100 });
        console.log(
          `[${username}][${keyword}] 제목과 필터링된 콘텐츠 입력 완료`
        );

        // "공개" 버튼 클릭
        const publishToggleSelector =
          "button.components-button.editor-post-publish-panel__toggle.editor-post-publish-button__button.is-primary.is-compact";
        await page.waitForSelector(publishToggleSelector, { visible: true });
        await page.click(publishToggleSelector);

        const confirmPublishButtonSelector =
          "button.components-button.editor-post-publish-button.editor-post-publish-button__button.is-primary.is-compact";
        await page.waitForSelector(confirmPublishButtonSelector, {
          visible: true,
        });
        await page.click(confirmPublishButtonSelector);
        console.log(`[${username}][${keyword}] 최종 게시 버튼 클릭 완료`);

        // 게시 완료 대기
        await page.waitForNavigation({ waitUntil: "networkidle2" });
        console.log(
          `[${username}][${keyword}] ✅ 게시물이 성공적으로 게시되었습니다.`
        );

        // 게시물 URL 복사
        console.log(
          `[${username}][${keyword}] 게시물 URL 복사를 위해 1.5초 대기`
        );
        await sleep(1500);

        // "URL 복사" 버튼 클릭
        const copyButtonSelector =
          "div.post-publish-panel__postpublish-post-address__copy-button-wrap > button.components-button.is-next-40px-default-size.is-secondary";
        await page.waitForSelector(copyButtonSelector, { visible: true });
        await page.click(copyButtonSelector);

        // 복사된 URL 가져오기
        const urlInputSelector =
          "input.components-text-control__input.is-next-40px-default-size#inspector-text-control-0";
        await page.waitForSelector(urlInputSelector, { visible: true });
        const copiedUrl = await page.$eval(urlInputSelector, (el) => el.value);

        if (copiedUrl) {
          console.log(`[${username}][${keyword}] 복사된 URL: ${copiedUrl}`);
          const urlFilePath = path.resolve(__dirname, "copied_urls.txt");
          await fs.appendFile(urlFilePath, `${title}: ${copiedUrl}\n`, "utf-8");
          console.log(
            `[${username}][${keyword}] ✅ 게시물 URL이 '${urlFilePath}'에 저장되었습니다.`
          );
          await updateKeywordEnd(keyword);
        } else {
          console.error(
            `[${username}][${keyword}] 클립보드에서 URL을 읽어오는 데 실패했습니다.`
          );
        }

        await page.close();
      } catch (error) {
        console.error(`[${username}][${keyword}] 에러 발생:`, error.message);
        await page.close();
      }
    })
  );

  // 모든 키워드 작업을 대기
  await Promise.all(keywordPromises);

  console.log(`### 워프 작업 완료: ${username} ###`);
};

(async () => {
  try {
    console.log("### 콘텐츠 생성 시작 ###");

    // 키워드 가져오기
    console.log("키워드 가져오는 중...");
    const keywordResponse = await axios.get(
      `${apiBaseUrl}/api/keywords/keywordEnd`
    );
    const allKeywords = keywordResponse.data.data
      .slice(0, 500)
      .map((k) => k.keyword);
    console.log(`가져온 키워드: ${allKeywords.length}개`);

    // 워프 목록 가져오기
    console.log("워프 목록 가져오는 중...");
    const worklistResponse = await axios.get(
      `${apiBaseUrl}/api/worklist/fetch`
    );
    const worklist = worklistResponse.data.data;
    console.log(`가져온 워프 계정: ${worklist.length}개`);

    // 계정별로 키워드 할당
    const perAccountKeywordLimit = 50; // 각 계정당 할당할 키워드 수
    const concurrencyLimit = 5; // 동시에 처리할 계정 수 (조정 필요)

    const accountLimit = pLimit(concurrencyLimit);

    const accountTasks = worklist.map((account) =>
      accountLimit(async () => {
        // 할당할 키워드 추출
        const assignedKeywords = allKeywords.splice(0, perAccountKeywordLimit);
        if (assignedKeywords.length === 0) {
          console.log(
            `모든 키워드가 소진되었습니다. ${account.username} 계정은 건너뜁니다.`
          );
          return;
        }

        // 브라우저 인스턴스 생성
        const browser = await puppeteer.launch({
          headless: true, // 성능 향상을 위해 true로 설정
          defaultViewport: null,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-gpu",
            "--window-size=1920,1080",
          ],
        });

        try {
          await processAccount(account, assignedKeywords, browser, 5); // keywordLimit = 5
        } finally {
          await browser.close();
        }
      })
    );

    // 모든 계정 작업을 병렬로 처리
    await Promise.all(accountTasks);

    console.log("✅ 모든 작업이 완료되었습니다.");
  } catch (error) {
    console.error("에러 발생:", error.message);
  }
})();
