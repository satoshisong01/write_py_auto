"use client";

import { createContext, useContext, useState } from "react";

/**
 * 전역 컨텍스트
 * - isRunning: 작업 중인지 여부
 * - setIsRunning: 상태 변경 함수
 */
const ProcessContext = createContext();

export function ProcessProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <ProcessContext.Provider value={{ isRunning, setIsRunning }}>
      {children}
    </ProcessContext.Provider>
  );
}

export function useProcess() {
  return useContext(ProcessContext);
}
