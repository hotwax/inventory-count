importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.3/workbox-sw.js');

const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { BackgroundSyncPlugin, Queue } = workbox.backgroundSync;

const bgSyncPlugin = new BackgroundSyncPlugin('testQueue', {
  maxRetentionTime: 5, // Retry for max of 5 minutes (specified in minutes)
  onSync({ queue }) {
    queue.replayRequests();
  }
});

// Cache all the urls those return the response with 0, 200 status,
// we can add support to filter the request that needs to be cached
//
// workbox.routing.registerRoute(
//   (payload) => {
//     return true
//   },
//   new workbox.strategies.CacheFirst({
//     cacheName: 'task-cache',
//     plugins: [
//       new CacheableResponsePlugin({
//         statuses: [0, 200],
//       }),
//     ]
//   }),
//   'GET' 
// );

async function handleCaching({url, request, event, params}) {
  const response = await fetch(request);
  const responseBody = await response.text();

  const db = indexedDB.open('cycleCounts', '1')

  db.onerror = (event) => {
    // Do something with db.error!
  };
  db.onsuccess = (event) => {
    // Do something with db.result!
  };

  return new Response(`${responseBody}`, {
    headers: response.headers,
  });
}

workbox.routing.registerRoute(
  ({ request }) => {
    return request.url.includes("rest/s1/inventory-cycle-count/cycleCounts/")
  },
  handleCaching,
  'GET' 
);



// const queue = new Queue("offlineSyncQueue");
// workbox.routing.registerRoute(
//   (payload) => {
//     return true
//   },
//   new workbox.strategies.NetworkOnly({
//     plugins: [{
//       fetchDidFail: async ({ request }) => {
//         console.log('request', request)
//         await queue.addRequest(request);
//       }
//     }],
//   }),
//   'DELETE'
// );

// Handling for enabling background sync of all the delete request
// Will store the requests made in indexedDB and as soon as network becomes available, will make the queued calls
// workbox.routing.registerRoute(
//   (payload) => {
//     return true
//   },
//   new workbox.strategies.NetworkOnly({
//     plugins: [bgSyncPlugin],
//   }),
//   'DELETE'
// );