import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    return false;
  }
}

// Middleware de autenticação básica integrado com banco de dados
export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Pontual App"');
    return res.status(401).json({ 
      message: "Acesso negado. Autenticação necessária." 
    });
  }

  (async () => {
    try {
      // Decodificar credenciais Basic Auth
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [username, password] = credentials.split(':');

      // Buscar usuário no banco de dados
      const user = await storage.getUserByUsername(username);
      
      if (!user || !(await comparePasswords(password, user.password))) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Pontual App"');
        return res.status(401).json({ 
          message: "Credenciais inválidas." 
        });
      }

      // Adicionar usuário ao request para uso posterior
      (req as any).user = user;
      next();
    } catch (error) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Pontual App"');
      return res.status(401).json({ 
        message: "Erro na autenticação." 
      });
    }
  })();
}

// Middleware opcional para rotas que podem ser públicas ou autenticadas
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [username, password] = credentials.split(':');

      const validUsername = process.env.AUTH_USERNAME || 'admin';
      const validPassword = process.env.AUTH_PASSWORD || 'admin123';

      if (username === validUsername && password === validPassword) {
        (req as any).user = { username };
      }
    } catch (error) {
      // Ignorar erros de autenticação opcional
    }
  }

  next();
}