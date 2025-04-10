import { reactive } from 'vue';

const state = reactive({
  webSocket: null,
  currentTopic: null,
  topicListener: null,
  tryReopenCount: 0,
  webSocketUrl: '',
  isInitialized: false,
}) as any;


function connectWebSocket() {
  if(state.webSocket && state.webSocket.readyState !== WebSocket.CLOSED) {
    return;
  }

  state.webSocket = new WebSocket(state.webSocketUrl);

  state.webSocket.onopen = () => {
    console.info('WebSocket connected');
    state.tryReopenCount = 0;

    if(state.currentTopic) {
      subscribeToFacility(state.currentTopic);
    }
  };

  state.webSocket.onmessage = (event: any) => {
    const jsonObj = JSON.parse(event.data);
    if(jsonObj.topic === state.currentTopic && state.topicListener) {
      state.topicListener(jsonObj);
    }
  };

  state.webSocket.onclose = () => {
    console.warn('WebSocket closed, retrying...');
    retryWebSocket();
  };

  state.webSocket.onerror = (event: any) => {
    console.error('WebSocket error:', event);
  };
}

// Retry logic
function retryWebSocket() {
  if(!state.webSocket ||
    state.webSocket.readyState === WebSocket.CLOSED ||
    state.webSocket.readyState === WebSocket.CLOSING && state.tryReopenCount < 6) {
    state.tryReopenCount += 1;
    setTimeout(() => connectWebSocket(), 30 * 1000);
  }
}

// Initialize once on login/app load
function initWebSocket(webSocketUrl: string, facilityId: string) {
  if(state.isInitialized) return;
  state.webSocketUrl = webSocketUrl;
  state.currentTopic = facilityId;
  state.isInitialized = true;
  connectWebSocket();
}

// Subscribe to facility topic
function subscribeToFacility(topic: string) {
  if(!state.webSocket) {
    connectWebSocket();
  }

  if(state.currentTopic !== topic) {
    if(state.currentTopic && state.webSocket.readyState === WebSocket.OPEN) {
      state.webSocket.send(`unsubscribe:${state.currentTopic}`);
    }

    state.currentTopic = topic;

    if(state.webSocket.readyState === WebSocket.OPEN) {
      state.webSocket.send(`subscribe:${topic}`);
    }
  }
}

// Register or change page listener
function registerTopicListener(callback: any) {
  state.topicListener = callback;
}

// Close connection (logout or teardown)
function closeWebSocket() {
  if(state.webSocket) {
    state.webSocket.onclose = null;
    state.webSocket.close();
    state.isInitialized = false;
    state.webSocket = null;
  }
}

export  {
  initWebSocket,
  subscribeToFacility,
  registerTopicListener,
  closeWebSocket,
};
