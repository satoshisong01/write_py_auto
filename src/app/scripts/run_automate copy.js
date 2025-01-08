// scripts/run_automate.js
const { spawn } = require("child_process");
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
 * Gemini API 사용량 로드 함수
 */
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
    apiKeys.forEach((keyVar) => {
      initialUsage[keyVar] = {
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

/**
 * Gemini API 사용량 업데이트 함수
 */
const updateGeminiApiUsage = async (apiKeyVar, usage) => {
  const usageFilePath = path.resolve(
    __dirname,
    "../../../gemini_api_usage.json"
  );
  try {
    const data = await fs.readFile(usageFilePath, "utf-8");
    const usageData = JSON.parse(data);
    usageData[apiKeyVar] = usage;
    await fs.writeFile(
      usageFilePath,
      JSON.stringify(usageData, null, 4),
      "utf-8"
    );
  } catch (error) {
    console.error("gemini_api_usage.json 업데이트 중 오류 발생:", error);
  }
};

/**
 * 자동화 스크립트 실행 함수
 */
const runAutomate = async (apiKeyVar) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "./automate.js");
    const env = { ...process.env, GEMINI_API_KEY: process.env[apiKeyVar] };

    const automateProcess = spawn("node", [scriptPath], {
      env,
      detached: true,
      stdio: "ignore",
    });

    automateProcess.on("error", (error) => {
      console.error(
        `automate.js 실행 중 오류 발생 (API Key: ${apiKeyVar}):`,
        error
      );
      reject(error);
    });

    automateProcess.on("close", (code) => {
      if (code === 0) {
        console.log(
          `automate.js가 정상적으로 종료되었습니다 (API Key: ${apiKeyVar}).`
        );
        resolve();
      } else {
        console.error(
          `automate.js가 비정상적으로 종료되었습니다 (API Key: ${apiKeyVar}). 코드: ${code}`
        );
        reject(new Error(`automate.js 종료 코드: ${code}`));
      }
    });

    // 백그라운드에서 실행되도록 설정
    automateProcess.unref();
  });
};

/**
 * sleep 함수 (비동기 대기)
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 메인 함수
 */
const main = async () => {
  while (true) {
    // 무한 루프
    const apiKeys = await loadGeminiApiKeys();
    const usageData = await loadGeminiApiUsage();
    const today = new Date().toISOString().split("T")[0];

    let anyKeyProcessed = false;

    for (const apiKeyVar of apiKeys) {
      const usage = usageData[apiKeyVar] || { date: today, count: 0 };

      // 날짜가 변경되었으면 사용량 초기화
      if (usage.date !== today) {
        usage.date = today;
        usage.count = 0;
      }

      // API 키의 사용량이 200 미만인 경우에만 실행
      if (usage.count < 200) {
        console.log(`### ${apiKeyVar} 사용 (${usage.count}/200) ###`);
        try {
          await runAutomate(apiKeyVar);
          usage.count += 200; // 한 번 실행당 200개 처리
          await updateGeminiApiUsage(apiKeyVar, usage);
          anyKeyProcessed = true;
        } catch (error) {
          console.error(`### ${apiKeyVar} 실행 중 오류 발생 ###`);
        }
      } else {
        console.log(
          `### ${apiKeyVar}는 오늘 최대 사용량에 도달했습니다 (${usage.count}/200) ###`
        );
      }
    }

    if (!anyKeyProcessed) {
      console.log(
        "모든 API 키가 오늘 최대 사용량에 도달했습니다. 다음 날을 기다립니다..."
      );
      // 하루(86400000ms) 대기
      await sleep(86400000);
    } else {
      // API 키가 처리되었으므로 잠시 대기 후 다시 확인
      await sleep(5000); // 5초 대기
    }
  }
};

main();
