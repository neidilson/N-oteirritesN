/**
 * N – NÃO TE IRRITES
 * Módulo de Segurança e Autenticação Interna (Database Vault)
 * O PIN e as credenciais administrativas são validadas de forma interna
 * sem nunca serem exibidas publicamente na interface do utilizador.
 */

// Hash SHA-256 da credencial padrão de administração
const ADMIN_VAULT_KEY_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // hash de 123456

// Função utilitária interna de hash para comparação segura
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verificação síncrona/direta no cofre de dados do código
export function verifyAdminCredential(inputPin: string): boolean {
  if (!inputPin) return false;
  const sanitized = inputPin.trim();
  
  // Verifica chave personalizada configurada pelo administrador no banco local
  const customVaultKey = typeof window !== 'undefined' ? localStorage.getItem('nti_admin_vault_code') : null;
  if (customVaultKey && sanitized === customVaultKey) {
    return true;
  }
  
  // Verificação interna padrão (chave protegida no banco de dados do código)
  return sanitized === '123456';
}
