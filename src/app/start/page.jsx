"use client";

import { useState, useEffect, useRef } from "react";

export default function StartProcessPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [logContent, setLogContent] = useState("");

  // 스크롤 컨테이너 참조
  const logContainerRef = useRef(null);

  // 컴포넌트 마운트 후 2초마다 로그 가져오기
  useEffect(() => {
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  // 로그가 바뀔 때마다 스크롤 자동 최하단으로
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logContent]);

  /**
   * "작업 시작" 버튼 클릭 시
   */
  const handleStartProcess = async () => {
    if (isRunning) return; // 이미 작업 중이면 무시
    setIsRunning(true); // 초록 불 ON
    setMessage("작업 시작 중...");

    try {
      const response = await fetch("/api/start-process", { method: "POST" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(`오류 발생: ${result.message}`);
        // 여기서 작업이 완전히 실패라면 빨간 불로 돌려도 됨
        setIsRunning(false);
      } else {
        setMessage("작업이 시작되었습니다!");
        setLogContent(""); // 기존 로그 초기화(프론트 표시용)

        // ★ 백그라운드 작업이 실제로 끝나기 전까지는 isRunning = true 유지
        // 끝나는 시점에 setIsRunning(false)를 호출해야 빨간 불로 변경됨
      }
    } catch (error) {
      setMessage(`에러 발생: ${error.message}`);
      setIsRunning(false);
    }
  };

  /**
   * (예시) "작업 중단" or "작업 종료" 버튼
   * 실제론 automate.js가 완전히 끝난 뒤 API로 신호를 받아서 isRunning(false)로 돌리는 게 정석.
   */
  // StartProcessPage.jsx

  const handleStopProcess = async () => {
    // (1) POST /api/stop-process
    try {
      const response = await fetch("/api/stop-process", { method: "POST" });
      const result = await response.json();
      if (result.success) {
        // 프로세스가 실제로 중단됨
        setMessage("작업이 중단되었습니다.");
        setIsRunning(false);
      } else {
        setMessage(`중단 실패: ${result.message}`);
      }
    } catch (error) {
      setMessage(`중단 API 오류: ${error.message}`);
    }
  };

  /**
   * 로그 가져오기
   */
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/automate/logs");
      const data = await res.json();
      if (data.success) {
        setLogContent(data.data);
        // 만약 특정 키워드 "SUCCESS_COUNT"가 로그 안에 있으면 isRunning(false)로 바꿀 수도 있음
      }
    } catch (error) {
      console.error("로그 요청 에러:", error);
    }
  };

  // 깜빡이는 동그라미 스타일
  const circleStyle = {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: isRunning ? "green" : "red", // true=녹색, false=빨강
    marginRight: "10px",
    animation: "blink 1s infinite", // 깜빡 애니메이션
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* (1) 깜빡이는 동그라미 + 상태 텍스트 */}
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        <div style={circleStyle}></div>
        <span style={{ fontSize: "16px", fontWeight: "bold" }}>
          {isRunning ? "작업 중..." : "작업 대기"}
        </span>
      </div>

      {/* (2) "작업 시작" 버튼 + (추가) "작업 중단" 버튼 */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleStartProcess}
          disabled={isRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: isRunning ? "#bdc3c7" : "#2ecc71",
            color: "#fff",
            borderRadius: "5px",
            cursor: isRunning ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          {isRunning ? "작업 중..." : "작업 시작"}
        </button>

        <button
          onClick={handleStopProcess}
          disabled={!isRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: !isRunning ? "#bdc3c7" : "#e74c3c",
            color: "#fff",
            borderRadius: "5px",
            cursor: !isRunning ? "not-allowed" : "pointer",
          }}
        >
          작업 중단
        </button>
      </div>

      <div style={{ color: "#2c3e50" }}>{message}</div>

      {/* (3) 자동화 로그 뷰어 */}
      <h2 style={{ marginTop: "40px" }}>자동화 로그</h2>
      <div
        ref={logContainerRef}
        style={{
          marginTop: "10px",
          whiteSpace: "pre-wrap",
          backgroundColor: "#f4f4f4",
          padding: "10px",
          borderRadius: "5px",
          maxHeight: "500px",
          overflowY: "auto",
        }}
      >
        {logContent || "로그가 없습니다."}
      </div>

      {/* (4) blink 애니메이션 정의 (전역) */}
      <style jsx global>{`
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
