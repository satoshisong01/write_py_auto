// scripts/run_automate.js

const axios = require("axios");
const path = require("path");
const fs = require("fs").promises;
require("dotenv").config();

/**
 * 1) Gemini API 키 로드
 */
const loadGeminiApiKeys = async () => {
  const apiKeys = [];
  for (let i = 1; i <= 62; i++) {
    const keyVar = `GEMINI_API_KEY${i}`;
    const key = process.env[keyVar];
    if (key) {
      apiKeys.push(keyVar);
    }
  }
  return apiKeys;
};

/**
 * 2) get-time에서 post_count 가져오기
 *   - Next.js 서버가 http://localhost:3000 에서 동작한다고 가정
 *   - 인증이 필요 없다면 Authorization 헤더 삭제 가능
 */
const fetchTimeSettingPostCount = async () => {
  try {
    const url = "http://localhost:3000/api/get-time";
    // 필요 시 제거
    const authToken = process.env.AUTH_TOKEN;

    // GET /api/get-time
    const getTimeRes = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 5000,
    });

    if (!getTimeRes.data.success) {
      console.warn("get-time API 실패:", getTimeRes.data.message);
      return 10; // fallback
    }
    // 예) { success:true, data:{ post_count:10, ... } }
    const timeData = getTimeRes.data.data;
    const postCount = timeData?.post_count ?? 10;
    console.log(`[get-time] post_count=${postCount}`);
    return postCount;
  } catch (error) {
    console.error("[fetchTimeSettingPostCount] API 오류:", error.message);
    return 10; // fallback
  }
};

/**
 * 3) 모든 계정이 목표치 이상 달성했는지
 *   - daily-records/fetch로 각 계정 post_count 확인
 */
const isAllAccountsReachedGoal = async (goal) => {
  try {
    const url = "http://localhost:3000/api/daily-records/fetch";
    // 필요 시 제거
    const authToken = process.env.AUTH_TOKEN;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.data.success) {
      console.error("daily-records/fetch API 실패:", response.data.message);
      return false;
    }

    const records = response.data.data;
    if (!records || records.length === 0) {
      return false; // 아직 데이터 없음 → 미달
    }

    // 모든 계정 post_count가 goal 이상인지?
    return records.every((r) => r.post_count >= goal);
  } catch (error) {
    console.error("isAllAccountsReachedGoal() 에러:", error.message);
    return false;
  }
};

/**
 * 4) automate.js 실행
 */
const runAutomate = async (apiKeyVar) => {
  try {
    const url = "http://localhost:3000/start-automate";
    const authToken = process.env.AUTH_TOKEN;

    console.log(`### ${apiKeyVar} 사용: ${process.env[apiKeyVar]} ###`);

    const response = await axios.post(
      url,
      { api_key_var: apiKeyVar },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 60000,
      }
    );

    if (response.data.success) {
      console.log(`automate.js 실행 성공 (API Key: ${apiKeyVar}).`);
    } else {
      console.error(
        `automate.js 실행 실패 (API Key: ${apiKeyVar}):`,
        response.data.message
      );
    }
  } catch (error) {
    console.error(`automate.js 실행 요청 오류 (${apiKeyVar}):`, error.message);
    throw error;
  }
};

/**
 * 5) automation.py 실행
 */
const runAutomationPy = async () => {
  try {
    const url = "http://localhost:3000/start-automation-py";
    const authToken = process.env.AUTH_TOKEN;

    console.log("automation.py 실행을 요청합니다.");

    const response = await axios.post(
      url,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 60000,
      }
    );

    if (response.data.success) {
      console.log("automation.py 실행 성공");
    } else {
      console.error("automation.py 실행 실패:", response.data.message);
    }
  } catch (error) {
    console.error("automation.py 실행 요청 오류:", error.message);
    throw error;
  }
};

/**
 * 6) daily-records/init (목표치와 worklist 전달)
 */
const initDailyWorkRecords = async (worklist, goal) => {
  try {
    const url = "http://localhost:3000/api/daily-records/init";
    const authToken = process.env.AUTH_TOKEN;

    const response = await axios.post(
      url,
      {
        worklist,
        post_count_goal: goal,
        api_key: process.env.API_KEY, // 필요 없다면 제거
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (!response.data.success) {
      throw new Error(`daily-records/init 실패: ${response.data.message}`);
    }
    console.log("[initDailyWorkRecords] daily-records가 정상적으로 초기화됨");
  } catch (error) {
    console.error("daily-records/init 에러:", error.message);
    throw error;
  }
};

/**
 * 7) sleep
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 8) 메인 함수
 */
const main = async () => {
  console.log("run_automate.js 실행 시작");

  try {
    // (A) get-time에서 post_count 가져오기
    const timeSettingPostCount = await fetchTimeSettingPostCount();
    console.log(`오늘 목표 post_count=${timeSettingPostCount}`);

    // (B) Gemini API 키 로드
    const apiKeys = await loadGeminiApiKeys();
    if (apiKeys.length === 0) {
      console.error("사용 가능한 Gemini API 키가 없습니다.");
      process.exit(1);
    }
    console.log(`로드된 Gemini API 키 수: ${apiKeys.length}`);

    // (C) 워크리스트 가져오기
    console.log("워크리스트 가져오는 중...");
    let worklist = null;
    try {
      const response = await axios.get(
        "http://localhost:3000/api/worklist/fetch",
        { headers: { Authorization: `Bearer ${process.env.AUTH_TOKEN}` } }
      );
      if (response.data.success) {
        worklist = response.data.data;
      } else {
        console.error("워크리스트 fetch 실패:", response.data.message);
      }
    } catch (error) {
      console.error("워크리스트 fetch 오류:", error.message);
    }

    if (!worklist) {
      console.error("워크리스트가 없으므로 종료");
      process.exit(1);
    }

    // (D) daily-records/init (worklist + 목표치)
    await initDailyWorkRecords(worklist, timeSettingPostCount);

    // (E) 각 API 키 순회하여 automate.js 실행
    for (const apiKeyVar of apiKeys) {
      if (await isAllAccountsReachedGoal(timeSettingPostCount)) {
        console.log("모든 계정이 이미 목표치 달성. 종료");
        break;
      }

      try {
        await runAutomate(apiKeyVar);
      } catch (error) {
        console.error(
          `### ${apiKeyVar}에 대한 automate.js 실행 실패 ###`,
          error
        );
      }

      if (await isAllAccountsReachedGoal(timeSettingPostCount)) {
        console.log("모든 계정이 목표치 달성. 더 이상 작업 안 함");
        break;
      }

      // 다음 키로 넘어가기 전 잠시 대기
      await sleep(2000);
    }

    console.log("모든 automate.js 작업이 종료되었거나 중단되었습니다.");

    // (F) worklist 다시 가져오기 -> automation.py 실행
    console.log("워크리스트 재가져오기...");
    let worklist2 = null;
    try {
      const response = await axios.get(
        "http://localhost:3000/api/worklist/fetch",
        { headers: { Authorization: `Bearer ${process.env.AUTH_TOKEN}` } }
      );
      if (response.data.success) {
        worklist2 = response.data.data;
      } else {
        console.error("워크리스트 fetch 실패2:", response.data.message);
      }
    } catch (error) {
      console.error("워크리스트 fetch 오류2:", error.message);
    }

    if (!worklist2) {
      console.error("워크리스트 없음 -> automation.py 실행 스킵");
    } else {
      // 파일로 저장 (선택)
      const dataFilePath = path.resolve(__dirname, "./worklist.json");
      await fs.writeFile(
        dataFilePath,
        JSON.stringify(worklist2, null, 4),
        "utf-8"
      );
      console.log("재가져온 워크리스트 -> worklist.json 저장 완료");

      // automation.py 실행
      try {
        await runAutomationPy();
        console.log("automation.py 실행 요청 완료");
      } catch (error) {
        console.error("automation.py 실행 중 오류:", error);
      }
    }

    console.log("### run_automate.js: 모든 작업 종료 ###");
  } catch (error) {
    console.error("메인 실행 중 오류:", error);
    process.exit(1);
  }
};

// 메인 실행
main();
