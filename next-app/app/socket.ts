"use client";

let ws: WebSocket | null = null;

export const createWebSocket = () => {
  if (ws && ws.readyState !== WebSocket.CLOSED) {
    return ws;
  }

  ws = new WebSocket(process.env.SOCKET_URI || "");

  ws.onopen = () => console.log("WebSocket connected");
  ws.onclose = () => {
    console.warn("WebSocket disconnected. Reconnecting...");
    setTimeout(createWebSocket, 3000);
  };
  ws.onerror = (error) => console.error("WebSocket Error:", error);

  return ws;
};
