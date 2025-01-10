// This module provides composable functions for managing NetSuite integrations, allowing for asynchronous operations such as 
//adding, editing, updating, and removing NetSuite IDs based on specified integration mapping data.
declare module "@/composables/useWebSocketComposables" {
  export function useWebSocketComposables(webSocketUrl: string): {
    initWebSocket: () => Promise<void>;
    tryReopen: () => Promise<void>;
    registerListener: (topic: string, callback: any) => Promise<void>;
  };
}