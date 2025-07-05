import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

// Configurar SendGrid API Key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private fromEmail = 'noreply@pontual.app'; // Será substituído por domínio verificado

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY não configurado. Email não será enviado.');
      return false;
    }

    try {
      const msg = {
        to: params.to,
        from: this.fromEmail,
        subject: params.subject,
        text: params.text,
        html: params.html,
      };

      await sgMail.send(msg);
      console.log(`✅ Email enviado para ${params.to}: ${params.subject}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(userEmail: string, username: string, temporaryPassword: string): Promise<boolean> {
    const subject = 'Bem-vindo ao Pontual - Suas credenciais de acesso';
    
    const text = `
Olá!

Você foi convidado para usar o sistema Pontual de controle de tempo e tarefas.

Suas credenciais de acesso:
- Usuário: ${username}
- Senha temporária: ${temporaryPassword}

IMPORTANTE: Por segurança, você deve redefinir sua senha no primeiro acesso.

Acesse o sistema em: ${process.env.APP_URL || 'http://localhost:5000'}

Atenciosamente,
Equipe Pontual
    `;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3B82F6;">Bem-vindo ao Pontual</h2>
  
  <p>Olá!</p>
  
  <p>Você foi convidado para usar o sistema <strong>Pontual</strong> de controle de tempo e tarefas.</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #495057;">Suas credenciais de acesso:</h3>
    <p><strong>Usuário:</strong> ${username}</p>
    <p><strong>Senha temporária:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</code></p>
  </div>
  
  <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; color: #856404;"><strong>⚠️ IMPORTANTE:</strong> Por segurança, você deve redefinir sua senha no primeiro acesso.</p>
  </div>
  
  <p>
    <a href="${process.env.APP_URL || 'http://localhost:5000'}" 
       style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Acessar Sistema
    </a>
  </p>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  
  <p style="color: #6c757d; font-size: 14px;">
    Atenciosamente,<br>
    <strong>Equipe Pontual</strong>
  </p>
</div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html,
    });
  }

  async sendPasswordResetEmail(userEmail: string, username: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    const subject = 'Pontual - Redefinição de senha';
    
    const text = `
Olá ${username}!

Você solicitou a redefinição de sua senha no sistema Pontual.

Para redefinir sua senha, acesse o link abaixo:
${resetUrl}

Este link é válido por 1 hora.

Se você não solicitou esta redefinição, ignore este email.

Atenciosamente,
Equipe Pontual
    `;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3B82F6;">Redefinição de Senha</h2>
  
  <p>Olá <strong>${username}</strong>!</p>
  
  <p>Você solicitou a redefinição de sua senha no sistema <strong>Pontual</strong>.</p>
  
  <p>Para redefinir sua senha, clique no botão abaixo:</p>
  
  <p>
    <a href="${resetUrl}" 
       style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Redefinir Senha
    </a>
  </p>
  
  <p style="color: #6c757d; font-size: 14px;">
    Ou copie e cole este link em seu navegador:<br>
    <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; word-break: break-all;">${resetUrl}</code>
  </p>
  
  <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; color: #856404;">⏰ Este link é válido por <strong>1 hora</strong>.</p>
  </div>
  
  <p style="color: #6c757d; font-size: 14px;">
    Se você não solicitou esta redefinição, ignore este email.
  </p>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  
  <p style="color: #6c757d; font-size: 14px;">
    Atenciosamente,<br>
    <strong>Equipe Pontual</strong>
  </p>
</div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html,
    });
  }

  generateTemporaryPassword(): string {
    // Gera senha temporária de 8 caracteres (letras e números)
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  generateResetToken(): string {
    // Gera token seguro para reset de senha
    return crypto.randomBytes(32).toString('hex');
  }
}

export const emailService = new EmailService();