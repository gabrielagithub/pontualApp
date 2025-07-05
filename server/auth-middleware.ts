import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || 'pontual_jwt_secret_key_2025';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    apiKey: string;
  };
}

// Middleware para autenticação via JWT token (login web)
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Token de acesso obrigatório' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    const user = await storage.getUser(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Token inválido ou usuário inativo' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      apiKey: user.apiKey || ''
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido' });
  }
}

// Middleware para autenticação via API Key (integração externa)
export async function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ message: 'API Key obrigatória no header X-API-Key' });
  }

  try {
    const user = await storage.getUserByApiKey(apiKey);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'API Key inválida ou usuário inativo' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      apiKey: user.apiKey || ''
    };
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno na autenticação' });
  }
}

// Middleware híbrido - aceita tanto JWT quanto API Key
export async function authenticateAny(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'] as string;
  
  // Priorizar JWT se presente
  if (authHeader) {
    return authenticateToken(req, res, next);
  }
  
  // Fallback para API Key
  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }
  
  return res.status(401).json({ 
    message: 'Autenticação obrigatória: forneça Bearer Token ou X-API-Key header' 
  });
}

// Middleware apenas para administradores
export async function authenticateAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authenticateToken(req, res, (err) => {
    if (err || !req.user) {
      return res.status(401).json({ message: "Token inválido" });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Acesso negado. Apenas administradores podem acessar esta funcionalidade." });
    }
    
    next();
  });
}

// Utilitários para autenticação
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateJwtToken(userId: number, username: string): string {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export async function createUserWithDefaults(
  username: string, 
  password: string, 
  email: string, 
  fullName: string,
  role: 'admin' | 'user' = 'user',
  mustResetPassword: boolean = false
) {
  const hashedPassword = await hashPassword(password);
  
  const userData = {
    username,
    password: hashedPassword,
    email,
    fullName,
    role,
    isActive: true,
    mustResetPassword
  };
  
  const user = await storage.createUser(userData);
  const apiKey = await storage.generateApiKey(user.id);
  
  return { ...user, apiKey };
}

export async function createUserByAdmin(
  username: string,
  email: string,
  fullName: string,
  role: 'admin' | 'user',
  temporaryPassword: string
) {
  return createUserWithDefaults(username, temporaryPassword, email, fullName, role, true);
}

export async function updateLastLogin(userId: number) {
  return storage.updateUser(userId, { lastLogin: new Date() });
}

export async function createPasswordResetToken(userId: number) {
  const crypto = await import('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  
  await storage.updateUser(userId, {
    resetToken,
    resetTokenExpiry
  });
  
  return resetToken;
}

export async function validateResetToken(token: string) {
  const user = await storage.getUserByResetToken(token);
  
  if (!user || !user.resetTokenExpiry) {
    return null;
  }
  
  if (new Date() > user.resetTokenExpiry) {
    return null; // Token expirado
  }
  
  return user;
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await validateResetToken(token);
  
  if (!user) {
    throw new Error('Token inválido ou expirado');
  }
  
  const hashedPassword = await hashPassword(newPassword);
  
  await storage.updateUser(user.id, {
    password: hashedPassword,
    resetToken: null,
    resetTokenExpiry: null,
    mustResetPassword: false
  });
  
  return user;
}