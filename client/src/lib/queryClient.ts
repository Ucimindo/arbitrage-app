import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE || "";
console.log('API_BASE configured as:', API_BASE);

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  console.log('Making API request:', method, fullUrl, data ? 'with data' : 'no data');
  
  try {
    const requestConfig = {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include" as RequestCredentials,
    };
    
    console.log('Request config:', requestConfig);
    
    const res = await fetch(fullUrl, requestConfig);

    console.log('API response status:', res.status);
    console.log('API response headers:', Object.fromEntries(res.headers.entries()));
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API request failed with error:', error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
