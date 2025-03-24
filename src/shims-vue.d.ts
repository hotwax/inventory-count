declare module '*.vue' {
  import { defineComponent } from 'vue'
  const component: ReturnType<typeof defineComponent>
  export default component
}

declare module '@/websocket' {
  export function initWebSocket(webSocketUrl: string, facilityId: string): void;
  export function subscribeToFacility(topic: string): void;
  export function registerTopicListener(callback: (data: any) => void): void;
  export function closeWebSocket(): void;
}