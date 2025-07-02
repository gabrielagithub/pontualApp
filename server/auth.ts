import { Request, Response, NextFunction } from "express";

// Middleware de autenticação básica simples
export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Pontual App"');
    return res.status(401).json({ 
      message: "Acesso negado. Autenticação necessária." 
    });
  }

  try {
    // Decodificar credenciais Basic Auth
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Credenciais válidas para teste (pode ser expandido para integrar com banco)
    // Por enquanto, aceitar as credenciais do usuário existente no banco
    if ((username === 'usuario' && password === 'senha123') ||
        (username === 'admin' && password === 'admin123')) {
      // Adicionar usuário ao request para uso posterior
      (req as any).user = { username };
      next();
    } else {
      res.setHeader('WWW-Authenticate', 'Basic realm="Pontual App"');
      return res.status(401).json({ 
        message: "Credenciais inválidas." 
      });
    }
  } catch (error) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Pontual App"');
    return res.status(401).json({ 
      message: "Erro na autenticação." 
    });
  }
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