import { onIonViewDidLeave } from '@ionic/vue';
import { reactive } from 'vue';

export function useWebSocketComposables(webSocketUrl: string) {
  const state = reactive({
    webSocket: null,
    currentTopic: null,
    topicListener: null,
    tryReopenCount: 0,
  }) as any;

  const initWebSocket = () => {
    state.webSocket = new WebSocket(webSocketUrl);

    state.webSocket.onopen = () => {
      state.tryReopenCount = 0;

      // Subscribe to all topics
      if(state.currentTopic) {
        state.webSocket.send(`subscribe:${state.currentTopic}`);
      }
    };

    state.webSocket.onmessage = (event: any) => {
      const jsonObj = JSON.parse(event.data);
      if (jsonObj.topic === state.currentTopic && state.topicListener) {
        state.topicListener(jsonObj);
      }
    };

    state.webSocket.onclose = () => {
      console.error('WebSocket closed');
      setTimeout(() => tryReopen(), 30 * 1000);
    };

    state.webSocket.onerror = (event: any) => {
      console.error('WebSocket error', event);
    };
  };

  const tryReopen = () => {
    if (
      (!state.webSocket ||
        state.webSocket.readyState === WebSocket.CLOSED ||
        state.webSocket.readyState === WebSocket.CLOSING) &&
      state.tryReopenCount < 6
    ) {
      state.tryReopenCount += 1;
      initWebSocket();
    }
  };

  const registerListener = (topic: string, callback: any) => {
    if (!state.webSocket) {
      initWebSocket();
    }

    if (state.currentTopic !== topic) {
      // Unsubscribe from the previous topic
      if (state.currentTopic && state.webSocket.readyState === WebSocket.OPEN) {
        state.webSocket.send(`unsubscribe:${state.currentTopic}`);
      }

      // Update the current topic and listener
      state.currentTopic = topic;
      state.topicListener = callback;

      // Subscribe to the new topic
      if (state.webSocket.readyState === WebSocket.OPEN) {
        state.webSocket.send(`subscribe:${topic}`);
      }
    } else if (state.topicListener !== callback) {
      // Update the callback if it has changed
      state.topicListener = callback;
    }
  };

  onIonViewDidLeave(() => {
    if (state.webSocket) {
      state.webSocket.onclose = null;
      state.webSocket.close();
    }
  });

  return {
    registerListener
  };
}
