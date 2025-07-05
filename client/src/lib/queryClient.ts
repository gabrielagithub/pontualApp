import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Função para obter token JWT
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  // Adicionar token JWT se disponível (exceto para login)
  const token = getAuthToken();
  if (token && !url.includes('/api/auth/login')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Se retornar 401, limpar token e redirecionar para login
  if (res.status === 401 && !url.includes('/api/auth/login')) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error('401: Token inválido');
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Adicionar token JWT se disponível
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      localStorage.removeItem('authToken');
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      // Redirecionar para login
      window.location.href = '/login';
      throw new Error('401: Token inválido');
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
      staleTime: 30000, // 30 seconds
      retry: (failureCount, error) => {
        // Não fazer retry para erros 401 ou 403
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        // Fazer retry para erros de conectividade (500) até 3 tentativas
        if (error?.message?.includes('500') && failureCount < 3) {
          return true;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000), // Delays mais longos: 2s, 4s, 8s, 15s
    },
    mutations: {
      retry: false,
    },
  },
});
