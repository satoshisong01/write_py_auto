// scripts/run_automate.js

const axios = require("axios");
const path = require("path");
const fs = require("fs").promises;
require("dotenv").config();

/**
 * Gemini API 키 로드 함수
 */
const loadGeminiApiKeys = async () => {
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

/**
 * daily-records/fetch API를 통해
 * 오늘 날짜 기준 모든 계정의 post_count가 50 이상인지 확인하는 함수
 */
const isAllAccountsReached50 = async () => {
  try {
    const localServerUrl = process.env.LOCAL_SERVER_URL;
    const authToken = process.env.AUTH_TOKEN;

    if (!localServerUrl || !authToken) {
      console.error("LOCAL_SERVER_URL 또는 AUTH_TOKEN이 설정되지 않았습니다.");
      return false;
    }

    const response = await axios.get(
      `${localServerUrl}/api/daily-records/fetch`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.data.success) {
      console.error(
        "daily-records/fetch API 호출 실패:",
        response.data.message
      );
      return false;
    }

    const records = response.data.data; // 오늘 날짜 기준이라고 가정
    if (!records || records.length === 0) {
      // 아예 레코드가 없으면 50을 못 채웠다고 봄
      return false;
    }

    // 모든 계정의 post_count가 50 이상인지 확인
    const allReached = records.every((r) => r.post_count >= 10);
    return allReached;
  } catch (error) {
    console.error("isAllAccountsReached50() 중 에러:", error.message);
    return false;
  }
};

/**
 * automate.js 실행 함수 via HTTP request
 */
const runAutomate = async (apiKeyVar) => {
  try {
    const localServerUrl = process.env.LOCAL_SERVER_URL;
    const authToken = process.env.AUTH_TOKEN;

    if (!localServerUrl || !authToken) {
      throw new Error(
        "LOCAL_SERVER_URL 또는 AUTH_TOKEN이 설정되지 않았습니다."
      );
    }

    console.log(`### ${apiKeyVar} 사용: ${process.env[apiKeyVar]} ###`);

    const response = await axios.post(
      `${localServerUrl}/start-automate`,
      { api_key_var: apiKeyVar }, // 필요 시 추가 데이터 전송
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 60000, // 60초 타임아웃
      }
    );

    if (response.data.success) {
      console.log(
        `automate.js가 성공적으로 실행되었습니다 (API Key: ${apiKeyVar}).`
      );
    } else {
      console.error(
        `automate.js 실행 실패 (API Key: ${apiKeyVar}):`,
        response.data.message
      );
    }
  } catch (error) {
    console.error(
      `automate.js 실행 요청 중 오류 발생 (API Key: ${apiKeyVar}):`,
      error.message
    );
    throw error;
  }
};

/**
 * automation.py 실행 함수 via HTTP request
 */
const runAutomationPy = async () => {
  try {
    const localServerUrl = process.env.LOCAL_SERVER_URL;
    const authToken = process.env.AUTH_TOKEN;

    if (!localServerUrl || !authToken) {
      console.error("LOCAL_SERVER_URL 또는 AUTH_TOKEN이 설정되지 않았습니다.");
      throw new Error("LOCAL_SERVER_URL 또는 AUTH_TOKEN not set");
    }

    console.log("automation.py 실행을 요청합니다.");

    const response = await axios.post(
      `${localServerUrl}/start-automation-py`,
      {}, // 필요한 데이터가 있다면 여기에 추가
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        timeout: 60000, // 60초 타임아웃
      }
    );

    if (response.data.success) {
      console.log("automation.py가 성공적으로 실행되었습니다.");
    } else {
      console.error("automation.py 실행 실패:", response.data.message);
      if (response.data.error) {
        console.error("오류 내용:", response.data.error);
      }
    }
  } catch (error) {
    console.error("automation.py 실행 요청 중 오류 발생:", error.message);
    throw error;
  }
};

/**
 * daily-records 테이블에
 * "오늘 날짜" 기준으로 없는 username들은 post_count=0으로 추가하는 함수
 */
const initDailyWorkRecords = async (worklist) => {
  try {
    const localServerUrl = process.env.LOCAL_SERVER_URL;
    const authToken = process.env.AUTH_TOKEN;

    if (!localServerUrl || !authToken) {
      throw new Error(
        "LOCAL_SERVER_URL 또는 AUTH_TOKEN이 설정되지 않았습니다."
      );
    }

    const response = await axios.post(
      `${localServerUrl}/api/daily-records/init`,
      {
        worklist,
        api_key: process.env.API_KEY,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(`daily-records/init 실패: ${response.data.message}`);
    }
    console.log("### daily-records가 정상적으로 초기화되었습니다. ###");
  } catch (error) {
    console.error("daily-records/init 에러:", error.message);
    throw error;
  }
};

/**
 * sleep 함수
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 메인 함수
 */
const main = async () => {
  console.log("run_automate.js 실행 시작");

  try {
    // 1. Gemini API 키 로드
    const apiKeys = await loadGeminiApiKeys();
    if (apiKeys.length === 0) {
      console.error(
        "사용 가능한 Gemini API 키가 없습니다. .env 파일을 확인하세요."
      );
      process.exit(1);
    }
    console.log(`로드된 Gemini API 키 수: ${apiKeys.length}`);

    // (A) 먼저 worklist를 가져옴
    console.log("워크리스트를 가져오는 중...");
    let worklist = null;
    try {
      const response = await axios.get(
        `${process.env.LOCAL_SERVER_URL}/api/worklist/fetch`,
        {
          headers: {
            Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
          },
        }
      );
      if (response.data.success) {
        worklist = response.data.data;
      } else {
        console.error(`워크리스트 가져오기 실패: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`워크리스트 가져오기 중 오류 발생: ${error.message}`);
    }

    if (!worklist) {
      console.error("워크리스트를 가져오지 못했습니다. 종료합니다.");
      process.exit(1);
    }

    // (B) daily-records 테이블에 누락된 계정 레코드 (post_count=0) 생성
    await initDailyWorkRecords(worklist);

    // 2. 각 API 키를 순회하며 automate.js 실행
    for (const apiKeyVar of apiKeys) {
      // 혹시 이미 모든 계정이 50개를 채웠는지(= 작업 끝인지) 확인
      if (await isAllAccountsReached50()) {
        console.log("모든 계정이 이미 50개를 작성했습니다. 작업 종료합니다.");
        break;
      }

      try {
        // 실제로 automate.js 실행 via HTTP 요청
        await runAutomate(apiKeyVar);
      } catch (error) {
        console.error(
          `### ${apiKeyVar}에 대한 automate.js 실행 실패 ###`,
          error
        );
      }

      // 다시 확인: 이번 키로 작업한 후 50을 다 채웠으면 나머지 키는 사용 안 하고 종료
      if (await isAllAccountsReached50()) {
        console.log(
          "모든 계정이 50개를 채웠습니다. 더 이상 작업하지 않고 종료합니다."
        );
        break;
      }

      // 다음 키로 넘어가기 전에 잠시 대기
      await sleep(2000); // 2초 정도 대기
    }

    console.log("모든 automate.js 작업을 마쳤거나, 중간에 중단되었습니다.");

    // 3. worklist.json을 만들어 automation.py 실행 via HTTP
    console.log("워크리스트를 다시 가져오는 중...");
    let worklist2 = null;
    try {
      const response = await axios.get(
        `${process.env.LOCAL_SERVER_URL}/api/worklist/fetch`,
        {
          headers: {
            Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
          },
        }
      );
      if (response.data.success) {
        worklist2 = response.data.data;
      } else {
        console.error(`워크리스트 가져오기 실패: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`워크리스트 가져오기 중 오류 발생: ${error.message}`);
    }

    if (!worklist2) {
      console.error(
        "워크리스트를 가져오지 못했습니다. automation.py를 실행하지 않습니다."
      );
    } else {
      const dataFilePath = path.resolve(__dirname, "./worklist.json");
      await fs.writeFile(
        dataFilePath,
        JSON.stringify(worklist2, null, 4),
        "utf-8"
      );
      console.log("워크리스트 데이터를 'worklist.json' 파일에 저장했습니다.");

      console.log("automation.py를 실행합니다.");
      try {
        await runAutomationPy();
        console.log("automation.py가 성공적으로 실행되었습니다.");
      } catch (error) {
        console.error("automation.py 실행 중 오류 발생:", error);
      }
    }

    console.log("### 모든 작업이 완료되어 스크립트를 종료합니다. ###");
  } catch (error) {
    console.error("메인 실행 중 오류 발생:", error);
    process.exit(1);
  }
};

main();
