/**
 * Formata o nome do usuário removendo underlines e tratando emails/slugs
 * Ex: 'adilson_jacinto' -> 'Adilson Jacinto'
 * Ex: 'ajacinto_dev' -> 'Ajacinto Dev'
 */
export function formatUserName(name?: string | null): string {
  if (!name) return 'Usuário';

  // Se tiver email como nome
  const baseName = name.includes('@') ? name.split('@')[0] : name;

  // Substitui underlines, hífens ou múltiplos espaços por espaço único
  const cleaned = baseName
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitaliza cada palavra
  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
