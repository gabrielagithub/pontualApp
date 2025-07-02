import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Função para obter credenciais Basic Auth do usuário
function getBasicAuthCredentials(): string | null {
  // Tentar obter credenciais armazenadas
  const storedCredentials = localStorage.getItem('pontual_auth_credentials');
  if (storedCredentials) {
    return storedCredentials;
  }

  // Se não tem credenciais, solicitar ao usuário
  const username = prompt('Digite seu nome de usuário:');
  const password = prompt('Digite sua senha:');
  
  if (username && password) {
    const credentials = btoa(`${username}:${password}`);
    localStorage.setItem('pontual_auth_credentials', credentials);
    return credentials;
  }
  
  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const authCredentials = getBasicAuthCredentials();
  
  if (!authCredentials) {
    throw new Error('Credenciais necessárias para acessar a API');
  }

  const headers: Record<string, string> = {
    'Authorization': `Basic ${authCredentials}`,
  };
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Se retornar 401, limpar credenciais e tentar novamente
  if (res.status === 401) {
    localStorage.removeItem('pontual_auth_credentials');
    throw new Error('401: Credenciais inválidas. Recarregue a página para tentar novamente.');
  }

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authCredentials = getBasicAuthCredentials();
    
    if (!authCredentials) {
      throw new Error('Credenciais necessárias para acessar a API');
    }

    const res = await fetch(queryKey[0] as string, {
      headers: {
        'Authorization': `Basic ${authCredentials}`,
      },
      credentials: "include",
    });

    if (res.status === 401) {
      localStorage.removeItem('pontual_auth_credentials');
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw new Error('401: Credenciais inválidas. Recarregue a página para tentar novamente.');
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
