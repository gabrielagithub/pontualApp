import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  isActive: boolean;
  mustResetPassword: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useAuth() {
  const token = localStorage.getItem('authToken');
  
  const { data: user, isLoading: loading, error } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    enabled: !!token, // Só fazer query se token existir
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isAuthenticated = !!token && !!user && !error;
  const isAdmin = user?.role === 'admin';

  return { 
    user, 
    loading: loading && !!token, // Só mostrar loading se token existir
    isAuthenticated,
    isAdmin,
    error 
  };
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiRequest('POST', '/api/auth/login', { username, password });
    const data = await response.json();
    
    if (response.ok) {
      // Armazenar o token no localStorage
      localStorage.setItem('authToken', data.token);
      
      // Forçar revalidação da query de usuário
      window.location.reload();
      
      return { success: true };
    } else {
      return { success: false, error: data.message || 'Erro no login' };
    }
  } catch (error) {
    return { success: false, error: 'Erro de conexão' };
  }
}

export function logout(): void {
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}