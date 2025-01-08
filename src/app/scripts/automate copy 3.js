// automate.js

const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();
const axios = require("axios");
const axiosRetry = require("axios-retry"); // 재시도 라이브러리 (버전 2.x 사용)
const { generateGeminiContent } = require("./gemini");
const pLimit = require("p-limit"); // 동시성 제한을 위한 라이브러리 (버전 2.x 사용)

// === 재시도 설정 (429 상태코드일 때 재시도) ===
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => error.response && error.response.status === 429,
});

// === sleep 함수 ===
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// === 셀렉터 wait 재시도 함수 추가 ===
/**
 * 지정된 selector를 maxAttempts번까지 대기 후 실패하면 throw
 * @param {Object} page Puppeteer의 page 객체
 * @param {string} selector 찾을 셀렉터
 * @param {number} maxAttempts 최대 시도 횟수
 * @param {number} waitTime 각 시도마다 대기할 시간(기본 60초)
 */
const pageWaitRetry = async (
  page,
  selector,
  maxAttempts = 3,
  waitTime = 60000
) => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      await page.waitForSelector(selector, {
        visible: true,
        timeout: waitTime,
      });
      return; // 성공 시 함수 종료
    } catch (err) {
      attempts++;
      console.log(
        `[pageWaitRetry] (${attempts}/${maxAttempts}) 셀렉터 대기 실패: ${selector}`
      );
      if (attempts >= maxAttempts) {
        throw new Error(
          `[pageWaitRetry] ${selector} 셀렉터를 ${maxAttempts}번 시도했으나 실패하였습니다.`
        );
      }
      // 재시도 전 잠깐 대기
      await sleep(2000);
    }
  }
};

// === 콘텐츠 필터링 함수 ===
const filterContent = (content) => {
  return content
    .replace(/## 1\.[\s\S]*?## 2\. 워드프레스 글 \(HTML\)\n\n```html/, "")
    .replace(/\n{15,}/g, "\n\n")
    .replace(/```\n*$/, "")
    .replace(/\*\*참고:\*[\s\S]*$/, "")
    .trim();
};

// === API 베이스 URL 설정 ===
const apiBaseUrl = "http://localhost:3000"; // 서버 URL

// === keyword_end 업데이트 함수 ===
const updateKeywordEnd = async (keyword) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/api/keywords/update`, {
      keyword: keyword,
    });

    if (response.data.success) {
      console.log(
        `[API] 키워드 "${keyword}"의 keyword_end가 1로 업데이트되었습니다.`
      );
    } else {
      console.error(`[API] 키워드 업데이트 실패: ${response.data.message}`);
    }
  } catch (error) {
    console.error(`[API] 키워드 업데이트 에러:`, error.message);
  }
};

// === 배치 기록 함수 ===
let isRecordingBatch = false; // 배치 기록 중인지 여부
let batchCounts = {}; // 배치 단위로 기록할 계정별 카운트
let globalSuccessCount = 0; // 전체 성공 게시물 카운트
let totalTargetCount = 0; // 총 목표 게시물 수

const recordBatchCounts = async () => {
  if (isRecordingBatch || Object.keys(batchCounts).length === 0) {
    return;
  }

  isRecordingBatch = true;
  const records = Object.entries(batchCounts).map(([username, postCount]) => ({
    username,
    postCount,
  }));

  // URL 디버깅 로그 추가
  const batchRecordUrl = `${apiBaseUrl}/api/daily-records/update`;
  console.log(`[DEBUG] 배치 기록 URL: ${batchRecordUrl}`);

  try {
    const response = await axios.post(batchRecordUrl, {
      records,
      api_key: process.env.API_KEY,
    });

    if (response.data.success) {
      console.log(`[API] 배치 기록 성공: ${records.length}개 계정`);
      // 배치 기록이 성공했으므로 배치 카운트를 초기화
      batchCounts = {};
      globalSuccessCount -= records.reduce(
        (acc, curr) => acc + curr.postCount,
        0
      );
      if (globalSuccessCount < 0) globalSuccessCount = 0;
    } else {
      console.error(`[API] 배치 기록 실패: ${response.data.message}`);
    }
  } catch (error) {
    console.error(`[API] 배치 기록 에러:`, error.message);
  } finally {
    isRecordingBatch = false;
    // 배치 기록 후 추가로 배치가 필요한지 확인
    if (globalSuccessCount >= 10) {
      // TARGET_BATCH_COUNT을 10으로 설정
      await recordBatchCounts();
    }
  }
};

// === 전역 성공 카운트 및 배치 기록 체크 함수 ===
const checkAndRecordBatch = async () => {
  const TARGET_BATCH_COUNT = 10; // 배치 목표 카운트
  if (globalSuccessCount >= TARGET_BATCH_COUNT && !isRecordingBatch) {
    await recordBatchCounts();
  }
};

// === Gemini API 키 로드 및 사용량 추적 ===
const loadGeminiApiKeys = async () => {
  // .env에서 GEMINI_API_KEY1, GEMINI_API_KEY2, ..., GEMINI_API_KEY15 로 불러옴
  const apiKeys = [];
  for (let i = 1; i <= 15; i++) {
    const keyVar = `GEMINI_API_KEY${i}`;
    const key = process.env[keyVar];
    if (key) {
      apiKeys.push(keyVar);
    }
  }
  return apiKeys;
};

const loadGeminiApiUsage = async () => {
  const usageFilePath = path.resolve(
    __dirname,
    "../../../gemini_api_usage.json"
  );
  try {
    const data = await fs.readFile(usageFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // 파일이 없으면 초기화
    const initialUsage = {};
    const apiKeys = await loadGeminiApiKeys();
    apiKeys.forEach((key) => {
      initialUsage[key] = {
        date: new Date().toISOString().split("T")[0], // YYYY-MM-DD 형식
        count: 0,
      };
    });
    await fs.writeFile(
      usageFilePath,
      JSON.stringify(initialUsage, null, 4),
      "utf-8"
    );
    return initialUsage;
  }
};

const updateGeminiApiUsage = async (apiKey, usage) => {
  const usageFilePath = path.resolve(
    __dirname,
    "../../../gemini_api_usage.json"
  );
  const data = await fs.readFile(usageFilePath, "utf-8");
  const usageData = JSON.parse(data);

  usageData[apiKey] = usage;

  await fs.writeFile(
    usageFilePath,
    JSON.stringify(usageData, null, 4),
    "utf-8"
  );
};

// === 현재 사용할 Gemini API 키 선택 함수 ===
const selectGeminiApiKey = async (usageData) => {
  const apiKeys = await loadGeminiApiKeys();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  for (const key of apiKeys) {
    if (
      !usageData[key] ||
      usageData[key].date !== today ||
      usageData[key].count < 200
    ) {
      // 새로운 날이거나, 200회 미만 사용된 키
      if (!usageData[key] || usageData[key].date !== today) {
        usageData[key] = {
          date: today,
          count: 0,
        };
      }
      return key;
    }
  }

  throw new Error("모든 Gemini API 키가 오늘 최대 사용량에 도달했습니다.");
};

// === 단일 계정을 처리하는 함수 ===
const processAccount = async (
  account,
  browser,
  keywordLimitPerAccount,
  accountUrlList,
  currentApiKey
) => {
  const { username, password, link } = account;
  console.log(`\n### 워프 작업 시작: ${username} ###`);

  // 계정당 병렬 처리할 키워드의 동시성 제한
  const limit = pLimit(5); // 한 번에 5개씩

  // 계정당 성공한 게시물 수
  let accountSuccessCount = 0;

  while (
    accountSuccessCount < keywordLimitPerAccount &&
    globalSuccessCount < totalTargetCount
  ) {
    // 키워드 가져오기
    try {
      const keywordResponse = await axios.get(
        `${apiBaseUrl}/api/keywords/keywordEnd`
      );
      const remainingKeywords = keywordResponse.data.data.map((k) => k.keyword);

      if (remainingKeywords.length === 0) {
        console.log(`더 이상 처리할 키워드가 없습니다.`);
        break;
      }

      // 동시성 제한을 위해 키워드 하나씩 처리
      await Promise.all(
        remainingKeywords.slice(0, 5).map((keyword) =>
          limit(async () => {
            if (
              accountSuccessCount >= keywordLimitPerAccount ||
              globalSuccessCount >= totalTargetCount
            ) {
              return;
            }

            // 키워드를 제거하여 다른 계정에서 중복되지 않게 함
            const currentKeywordIndex = keywordResponse.data.data.findIndex(
              (k) => k.keyword === keyword
            );
            if (currentKeywordIndex === -1) {
              return;
            }
            remainingKeywords.splice(currentKeywordIndex, 1);

            let page;
            try {
              const sanitizedKeyword = keyword
                .replace(/[^a-z0-9]/gi, "_")
                .toLowerCase();
              const outputFile = `post_content_${sanitizedKeyword}.json`;

              page = await browser.newPage();
              // 페이지 기본 타임아웃, 네비게이션 타임아웃 늘리기 (60초)
              await page.setDefaultTimeout(60000);
              await page.setDefaultNavigationTimeout(60000);

              console.log(`\n### [${username}][${keyword}] ###`);

              // === Gemini API로 콘텐츠 생성 ===
              console.log(
                `[${username}][${keyword}] Gemini API로 콘텐츠 생성 중...`
              );
              let postData = await generateGeminiContent(
                keyword,
                currentApiKey
              );

              if (!postData || !postData.title || !postData.content) {
                throw new Error(`[${keyword}] 제목 또는 콘텐츠 생성 실패`);
              }

              // 이전 URL들을 콘텐츠에 추가
              if (accountUrlList.length > 0) {
                const urlsToAdd = accountUrlList.slice(-5).reverse(); // 최신순으로 최대 5개
                const urlsText = urlsToAdd.map((url) => `${url}`).join("\n");
                postData.content += `\n\n${urlsText}\n.\n`;
              }

              const filteredContent = filterContent(postData.content);

              // === 생성된 콘텐츠를 JSON 파일로 저장 ===
              await fs.writeFile(
                outputFile,
                JSON.stringify(
                  { ...postData, content: filteredContent },
                  null,
                  4
                ),
                "utf-8"
              );
              console.log(
                `[${username}][${keyword}] 콘텐츠가 '${outputFile}'에 저장되었습니다.`
              );

              // === 프롬프트 및 응답을 텍스트 파일에 저장 ===
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

              // === 워드프레스 새 글 작성 페이지로 이동 ===
              const postNewUrl = link;
              await page.goto(postNewUrl, {
                waitUntil: "networkidle2",
                timeout: 60000,
              });

              // 현재 URL이 로그인 페이지인지 확인
              if (page.url().includes("wp-login.php")) {
                console.log(
                  `[${username}][${keyword}] 로그인 페이지로 이동 중입니다...`
                );

                // .env 대신 바로 account에서 가져옴
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

                // 재시도하며 셀렉터 대기
                await pageWaitRetry(page, usernameSelector, 3, 60000);
                await page.type(usernameSelector, WP_USERNAME, { delay: 100 });

                // 아이디 입력 후 0.5초 대기
                await sleep(500);

                await pageWaitRetry(page, passwordSelector, 3, 60000);
                await page.type(passwordSelector, WP_PASSWORD, { delay: 100 });

                // 비밀번호 입력 후 0.5초 대기
                await sleep(500);

                await page.click(loginButtonSelector);

                // 로그인 후 새 글 작성 페이지로 이동
                await page.waitForNavigation({
                  waitUntil: "networkidle2",
                  timeout: 60000,
                });
                await page.goto(postNewUrl, {
                  waitUntil: "networkidle2",
                  timeout: 60000,
                });
              }

              console.log(
                `[${username}][${keyword}] 로그인 완료 및 새 글 작성 페이지로 이동했습니다.`
              );

              // === 옵션 버튼 클릭 (3점 메뉴) ===
              const optionsButtonSelector = 'button[aria-label="옵션"]';
              await pageWaitRetry(page, optionsButtonSelector, 3, 60000);
              await page.click(optionsButtonSelector);
              console.log(`[${username}][${keyword}] 옵션 버튼 클릭 완료`);

              // === "코드 편집기" 버튼 선택 ===
              const menuItemsSelector =
                'button[role="menuitemradio"] span.components-menu-item__item';
              await pageWaitRetry(page, menuItemsSelector, 3, 60000);

              const menuItems = await page.$$(menuItemsSelector);
              let codeEditorButtonHandle = null;

              for (const item of menuItems) {
                const text = await page.evaluate(
                  (el) => el.textContent.trim(),
                  item
                );
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

              // === 일반 편집 모드로 복귀 ===
              const exitCodeEditorButtonSelector = "button.is-tertiary";
              await pageWaitRetry(page, exitCodeEditorButtonSelector, 3, 60000);
              await page.click(exitCodeEditorButtonSelector);
              console.log(
                `[${username}][${keyword}] 일반 편집 모드로 전환 완료`
              );

              // === 제목 입력 ===
              const titleSelector = "textarea#inspector-textarea-control-0";
              await pageWaitRetry(page, titleSelector, 3, 60000);
              await page.type(titleSelector, title, { delay: 100 });

              // === 콘텐츠 입력 ===
              const contentSelector = "textarea#post-content-0";
              await pageWaitRetry(page, contentSelector, 3, 60000);
              await page.focus(contentSelector);
              // 직접 value를 넣어주고 이벤트를 트리거
              await page.evaluate(
                (selector, value) => {
                  const textarea = document.querySelector(selector);
                  if (textarea) {
                    textarea.value = value;
                    textarea.dispatchEvent(
                      new Event("input", { bubbles: true })
                    );
                  }
                },
                contentSelector,
                filteredContent
              );

              // 마지막에 약간의 입력
              await page.type(contentSelector, ".", { delay: 100 });
              console.log(
                `[${username}][${keyword}] 제목과 필터링된 콘텐츠 입력 완료`
              );

              // === "공개" 버튼 클릭 (첫 번째) ===
              const publishToggleSelector =
                "button.components-button.editor-post-publish-panel__toggle.editor-post-publish-button__button.is-primary.is-compact";
              await pageWaitRetry(page, publishToggleSelector, 3, 60000);
              await page.click(publishToggleSelector);

              // === "공개" 버튼 클릭 (확인) ===
              const confirmPublishButtonSelector =
                "button.components-button.editor-post-publish-button.editor-post-publish-button__button.is-primary.is-compact";
              await pageWaitRetry(page, confirmPublishButtonSelector, 3, 60000);
              await page.click(confirmPublishButtonSelector);
              console.log(`[${username}][${keyword}] 최종 게시 버튼 클릭 완료`);

              // 게시 완료 대기
              await page.waitForNavigation({
                waitUntil: "networkidle2",
                timeout: 60000,
              });
              console.log(
                `[${username}][${keyword}] ✅ 게시물이 성공적으로 게시되었습니다.`
              );

              // === 게시물 URL 복사 ===
              console.log(
                `[${username}][${keyword}] 게시물 URL 복사를 위해 1.5초 대기`
              );
              await sleep(1500);

              const copyButtonSelector =
                "div.post-publish-panel__postpublish-post-address__copy-button-wrap > button.components-button.is-next-40px-default-size.is-secondary";
              await pageWaitRetry(page, copyButtonSelector, 3, 60000);
              await page.click(copyButtonSelector);

              // 복사된 URL 가져오기
              const urlInputSelector =
                "input.components-text-control__input.is-next-40px-default-size#inspector-text-control-0";
              await pageWaitRetry(page, urlInputSelector, 3, 60000);
              const copiedUrl = await page.$eval(
                urlInputSelector,
                (el) => el.value
              );

              if (copiedUrl) {
                console.log(
                  `[${username}][${keyword}] 복사된 URL: ${copiedUrl}`
                );
                const urlFilePath = path.resolve(__dirname, "copied_urls.txt");
                await fs.appendFile(
                  urlFilePath,
                  `${title}: ${copiedUrl}\n`,
                  "utf-8"
                );
                console.log(
                  `[${username}][${keyword}] ✅ 게시물 URL이 '${urlFilePath}'에 저장되었습니다.`
                );

                const urlFilePath2 = path.resolve(
                  __dirname,
                  "copied_urls2.txt"
                );
                await fs.appendFile(
                  urlFilePath2,
                  `${username}: ${copiedUrl}\n`,
                  "utf-8"
                );
                console.log(
                  `[${username}][${keyword}] ✅ 게시물 URL이 '${urlFilePath2}'에 저장되었습니다.`
                );

                // URL 리스트 업데이트
                accountUrlList.push(copiedUrl);
                if (accountUrlList.length > 5) {
                  accountUrlList.shift(); // 오래된 URL 제거
                }

                // === 성공 카운트 업데이트 ===
                accountSuccessCount += 1;
                globalSuccessCount += 1;

                // === 배치 카운트 업데이트 ===
                if (batchCounts[username]) {
                  batchCounts[username] += 1;
                } else {
                  batchCounts[username] = 1;
                }

                // === 배치 기록 체크 ===
                await checkAndRecordBatch();

                // === 키워드 end=1 처리 ===
                await updateKeywordEnd(keyword);
              } else {
                console.error(
                  `[${username}][${keyword}] 클립보드에서 URL을 읽어오는 데 실패했습니다.`
                );
              }
            } catch (error) {
              console.error(
                `[${username}][${keyword}] 에러 발생:`,
                error.message
              );
            } finally {
              // 페이지 닫기 (에러 발생 여부와 상관없이 닫기)
              if (page) {
                try {
                  await page.close();
                } catch (closeErr) {
                  console.error(
                    `[${username}][${keyword}] 페이지 닫기 중 에러:`,
                    closeErr.message
                  );
                }
              }
            }
          })
        )
      );
    } catch (error) {
      console.error(`[${username}] 키워드 가져오기 에러:`, error.message);
    }
  }

  console.log(`### 워프 작업 완료: ${username} ###`);
};

// === 메인 함수 ===
(async () => {
  try {
    console.log("### 콘텐츠 생성 시작 ###");

    // === 워프 목록 가져오기 ===
    console.log("워프 목록 가져오는 중...");
    const worklistResponse = await axios.get(
      `${apiBaseUrl}/api/worklist/fetch`
    );
    const worklist = worklistResponse.data.data;
    console.log(`가져온 워프 계정: ${worklist.length}개`);

    // === daily-records/fetch API를 호출하여 현재 post_count 가져오기 ===
    console.log("현재 각 계정의 post_count를 가져오는 중...");
    const fetchResponse = await axios.get(
      `${apiBaseUrl}/api/daily-records/fetch`
    );

    if (!fetchResponse.data.success) {
      throw new Error(`fetch API 호출 실패: ${fetchResponse.data.message}`);
    }

    const dailyRecords = fetchResponse.data.data;
    const usernameToPostCount = {};
    dailyRecords.forEach((record) => {
      usernameToPostCount[record.username] = record.post_count;
    });

    console.log("현재 post_count를 성공적으로 가져왔습니다.");

    // === Gemini API 키 로드 및 사용량 추적 ===
    const apiKeys = await loadGeminiApiKeys();
    const usageData = await loadGeminiApiUsage();
    const selectedApiKeyVar = await selectGeminiApiKey(usageData);
    const selectedApiKey = process.env[selectedApiKeyVar];

    console.log(`선택된 Gemini API 키: ${selectedApiKeyVar}`);

    // 현재 API 키의 사용량 업데이트
    // usageData[selectedApiKeyVar].count += 200; // 한 번에 200개 처리
    // await updateGeminiApiUsage(selectedApiKeyVar, usageData[selectedApiKeyVar]);

    // 계정별로 키워드 제한 계산
    const accountsWithQuota = worklist
      .map((account) => {
        const { username } = account;
        const currentPostCount = usernameToPostCount[username] || 0;
        const keywordLimitPerAccount = Math.max(50 - currentPostCount, 0);
        return { ...account, keywordLimitPerAccount };
      })
      .filter((account) => account.keywordLimitPerAccount > 0); // 50개 미만인 계정만 필터링

    // 총 목표 게시물 수 계산
    totalTargetCount = accountsWithQuota.reduce(
      (acc, account) => acc + account.keywordLimitPerAccount,
      0
    );
    console.log(`총 목표 게시물 수: ${totalTargetCount}`);

    const concurrencyLimit = 5; // 동시에 처리할 계정 수
    const accountLimit = pLimit(concurrencyLimit);

    // 각 계정별 URL 리스트 (최대 5개)
    const accountUrlLists = {};

    const accountTasks = accountsWithQuota.map((account) =>
      accountLimit(async () => {
        const { username } = account;
        const keywordLimitPerAccount = account.keywordLimitPerAccount;

        accountUrlLists[username] = [];

        // === 브라우저 인스턴스 생성 ===
        const browser = await puppeteer.launch({
          headless: true,
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
          await processAccount(
            account,
            browser,
            keywordLimitPerAccount,
            accountUrlLists[username],
            selectedApiKey
          );
        } finally {
          await browser.close();
        }
      })
    );

    // === 모든 계정 작업 병렬 처리 ===
    await Promise.all(accountTasks);

    console.log("✅ 모든 작업이 완료되었습니다.");
    console.log(`총 성공 게시물 수: ${globalSuccessCount}`);

    // === 남아있는 배치 기록 ===
    if (globalSuccessCount > 0 && !isRecordingBatch) {
      await recordBatchCounts();
    }

    console.log("✅ 남아있는 배치 기록도 완료되었습니다.");

    // === 성공 카운트 출력 ===
    console.log(`SUCCESS_COUNT:${globalSuccessCount}`);
  } catch (error) {
    console.error("에러 발생:", error.message);
    // 에러 발생 시에도 성공 카운트를 출력하여 run_automate.js가 알 수 있도록 함
    console.log(`SUCCESS_COUNT:${globalSuccessCount}`);
  }
})();
