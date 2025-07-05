import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || 'pontual_jwt_secret_key_2025';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
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

export async function createUserWithDefaults(username: string, password: string, email?: string, fullName?: string) {
  const hashedPassword = await hashPassword(password);
  
  const userData = {
    username,
    password: hashedPassword,
    email: email || undefined,
    fullName: fullName || null,
    isActive: true
  };
  
  const user = await storage.createUser(userData);
  const apiKey = await storage.generateApiKey(user.id);
  
  return { ...user, apiKey };
}