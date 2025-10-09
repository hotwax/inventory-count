export default async function workerApi(customConfig: {
  url: string;
  method?: string;
  data?: any;
  params?: Record<string, string>;
  baseURL?: string;
  headers?: Record<string, string>;
}) {
  const { url, method = "GET", data, params, baseURL, headers = {} } = customConfig;

  // Build URL
  let fullUrl = baseURL ? `${baseURL}${url}` : url;
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    fullUrl += `?${queryString}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  };

  if (data && method.toUpperCase() !== "GET") {
    fetchOptions.body = JSON.stringify(data);
  }

  const response = await fetch(fullUrl, fetchOptions);
  const result = await response.json();

  if (!response.ok) {
    throw result;
  }
  return result;
}