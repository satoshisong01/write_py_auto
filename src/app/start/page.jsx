"use client";

import { useState, useEffect, useRef } from "react";

export default function StartProcessPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [logContent, setLogContent] = useState("");

  // 스크롤 컨테이너 참조
  const logContainerRef = useRef(null);

  // 컴포넌트 마운트 후 20초마다 로그 가져오기
  useEffect(() => {
    fetchLogs(); // 초기 로그 가져오기
    const interval = setInterval(fetchLogs, 20000);
    return () => clearInterval(interval);
  }, []);

  // 로그가 바뀔 때마다 스크롤 자동 최하단으로
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logContent]);

  /**
   * (1) "작업 시작" 버튼 - 기존 로직
   *  -> /api/start-process 로 요청하면 automate.js 후 automation.py까지 모두 진행
   */
  const handleStartProcess = async () => {
    if (isRunning) return; // 이미 작업 중이면 무시
    setIsRunning(true);
    setMessage("전체 프로세스 시작 중...");
    setLogContent("");

    try {
      const response = await fetch("/api/start-process", { method: "POST" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(`오류 발생: ${result.message}`);
        setIsRunning(false);
      } else {
        setMessage("전체 프로세스가 시작되었습니다!");
      }
    } catch (error) {
      setMessage(`에러 발생: ${error.message}`);
      setIsRunning(false);
    }
  };

  /**
   * (2) "작업 중단" 버튼 - 기존 로직
   *  -> /api/stop-process 로 요청
   */
  const handleStopProcess = async () => {
    try {
      const response = await fetch("/api/stop-process", { method: "POST" });
      const result = await response.json();
      if (result.success) {
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
   * (3) "글쓰기 시작" 버튼
   *  -> automate.js 만 실행 (API 라우트: /api/start-write)
   */
  const handleStartWrite = async () => {
    if (isRunning) return; // 이미 작업 중이면 무시
    setIsRunning(true);
    setMessage("글쓰기(automate.js) 시작 중...");
    setLogContent("");

    try {
      const response = await fetch("/api/start-write", { method: "POST" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(`오류 발생: ${result.message}`);
        setIsRunning(false);
      } else {
        setMessage("글쓰기(automate.js)가 시작되었습니다!");
      }
    } catch (error) {
      setMessage(`에러 발생: ${error.message}`);
      setIsRunning(false);
    }
  };

  /**
   * (4) "색인 요청 시작" 버튼
   *  -> automation.py 만 실행 (API 라우트: /api/start-index)
   */
  const handleStartIndex = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setMessage("색인 요청(automation.py) 시작 중...");
    setLogContent("");

    try {
      const response = await fetch("/api/start-index", { method: "POST" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(`오류 발생: ${result.message}`);
        setIsRunning(false);
      } else {
        setMessage("색인 요청(automation.py)이 시작되었습니다!");
      }
    } catch (error) {
      setMessage(`에러 발생: ${error.message}`);
      setIsRunning(false);
    }
  };

  /**
   * 로그 가져오기
   */
  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/automate/logs?ts=${new Date().getTime()}`, {
        // 캐시 방지
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setLogContent(data.data);
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

      {/* (2) 기존 "작업 시작" 버튼 / "작업 중단" 버튼 */}
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
            marginRight: "10px",
          }}
        >
          작업 중단
        </button>
      </div>

      {/* (3) 추가 버튼: "글쓰기 시작", "색인 요청 시작" */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleStartWrite}
          disabled={isRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: isRunning ? "#bdc3c7" : "#2980b9",
            color: "#fff",
            borderRadius: "5px",
            cursor: isRunning ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          글쓰기 시작
        </button>

        <button
          onClick={handleStartIndex}
          disabled={isRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: isRunning ? "#bdc3c7" : "#8e44ad",
            color: "#fff",
            borderRadius: "5px",
            cursor: isRunning ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          색인 요청 시작
        </button>
      </div>

      {/* 상태 메시지 출력 */}
      <div style={{ color: "#2c3e50", marginBottom: "10px" }}>{message}</div>

      {/* (4) 자동화 로그 뷰어 */}
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

      {/* (5) blink 애니메이션 정의 (전역) */}
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
