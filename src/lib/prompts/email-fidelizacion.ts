import { UserProfile } from '../firestore-models';

interface UserSummary {
  summary: {
    totalDocuments: number;
    totalSpent: number;
    successRate: number;
    averageProcessingTime: number;
  };
}

/**
 * Genera prompt personalizado basado en el tipo de usuario y su comportamiento
 */
export function generatePersonalizedEmailPrompt(userData: UserProfile, userSummary: UserSummary): {
  systemPrompt: string;
  userPrompt: string;
} {
  const plan = userData.subscription?.plan || 'free';
  const activity = userSummary.summary.totalDocuments;
  const spending = userSummary.summary.totalSpent;
  const successRate = userSummary.summary.successRate;

  // Determinar el tipo de email basado en el comportamiento
  const emailType = determineEmailType(plan, activity, spending, successRate);
  
  const systemPrompt = getSystemPrompt(emailType);
  const userPrompt = buildUserPrompt(userData, userSummary, emailType);

  return { systemPrompt, userPrompt };
}

/**
 * Determina el tipo de email basado en el comportamiento del usuario
 */
function determineEmailType(plan: string, activity: number, spending: number, successRate: number): string {
  // Usuario gratuito muy activo -> Upsell
  if (plan === 'free' && activity > 5) {
    return 'upsell';
  }
  
  // Usuario premium inactivo -> Re-engagement
  if (plan === 'premium' && activity < 2) {
    return 'reengagement';
  }
  
  // Usuario con alta inversión -> VIP
  if (spending > 100) {
    return 'vip';
  }
  
  // Usuario nuevo -> Onboarding
  if (activity < 3) {
    return 'onboarding';
  }
  
  // Usuario regular -> Fidelización
  return 'loyalty';
}

/**
 * Obtiene el system prompt según el tipo de email
 */
function getSystemPrompt(emailType: string): string {
  const prompts = {
    upsell: `Eres un especialista en ventas B2B para plataformas legales. Tu objetivo es convertir usuarios gratuitos activos a planes premium.
    
    Características del email:
    - Tono profesional pero cercano
    - Destaca las limitaciones del plan gratuito
    - Presenta beneficios específicos del plan premium
    - Incluye casos de uso reales
    - Llamada a la acción clara y urgente
    - Formato HTML con estilos CSS inline
    
    Responde SOLO con HTML válido, sin explicaciones.`,

    reengagement: `Eres un especialista en retención de clientes para plataformas SaaS legales. Tu objetivo es reactivar usuarios premium inactivos.
    
    Características del email:
    - Tono preocupado pero optimista
    - Reconoce su valor como cliente premium
    - Destaca nuevas funcionalidades disponibles
    - Ofrece soporte personalizado
    - Incentivos para volver a usar la plataforma
    - Formato HTML con estilos CSS inline
    
    Responde SOLO con HTML válido, sin explicaciones.`,

    vip: `Eres un especialista en relaciones con clientes VIP para plataformas legales. Tu objetivo es mantener y fortalecer la relación con clientes de alto valor.
    
    Características del email:
    - Tono exclusivo y personalizado
    - Reconocimiento de su inversión y confianza
    - Acceso anticipado a nuevas funcionalidades
    - Soporte prioritario y personalizado
    - Invitaciones a eventos exclusivos
    - Formato HTML con estilos CSS inline
    
    Responde SOLO con HTML válido, sin explicaciones.`,

    onboarding: `Eres un especialista en onboarding para plataformas legales. Tu objetivo es guiar a nuevos usuarios y maximizar su adopción.
    
    Características del email:
    - Tono acogedor y educativo
    - Tutoriales paso a paso
    - Casos de uso comunes
    - Recursos de aprendizaje
    - Soporte proactivo
    - Formato HTML con estilos CSS inline
    
    Responde SOLO con HTML válido, sin explicaciones.`,

    loyalty: `Eres un especialista en fidelización para plataformas legales. Tu objetivo es fortalecer la relación con usuarios regulares.
    
    Características del email:
    - Tono profesional y agradecido
    - Reconocimiento de su actividad
    - Sugerencias de optimización
    - Nuevas funcionalidades relevantes
    - Casos de éxito de otros usuarios
    - Formato HTML con estilos CSS inline
    
    Responde SOLO con HTML válido, sin explicaciones.`
  };

  return prompts[emailType as keyof typeof prompts] || prompts.loyalty;
}

/**
 * Construye el prompt del usuario con datos específicos
 */
function buildUserPrompt(userData: UserProfile, userSummary: UserSummary, emailType: string): string {
  const { summary } = userSummary;
  
  const baseData = `
DATOS DEL USUARIO:
- Nombre: ${userData.displayName || 'Cliente'}
- Email: ${userData.email}
- Plan: ${userData.subscription?.plan || 'Gratuito'}
- Registrado: ${new Date(userData.createdAt).toLocaleDateString('es-ES')}
- Último acceso: ${new Date(userData.lastLoginAt).toLocaleDateString('es-ES')}

ESTADÍSTICAS DE USO:
- Documentos generados: ${summary.totalDocuments}
- Inversión total: €${summary.totalSpent}
- Tasa de éxito: ${(summary.successRate * 100).toFixed(1)}%
- Tiempo promedio de procesamiento: ${summary.averageProcessingTime}ms`;

  const specificPrompts = {
    upsell: `${baseData}

GENERA UN EMAIL DE UPSELL que:
1. Reconozca su actividad (${summary.totalDocuments} documentos)
2. Destaque las limitaciones del plan gratuito
3. Presente beneficios específicos del plan premium
4. Incluya casos de uso reales para su perfil
5. Tenga una llamada a la acción urgente
6. Sea personalizado para ${userData.displayName}`,

    reengagement: `${baseData}

GENERA UN EMAIL DE RE-ENGAGEMENT que:
1. Reconozca su valor como cliente premium
2. Destaque nuevas funcionalidades disponibles
3. Ofrezca soporte personalizado
4. Incluya incentivos para volver a usar la plataforma
5. Sea empático con su inactividad
6. Motive el retorno inmediato`,

    vip: `${baseData}

GENERA UN EMAIL VIP que:
1. Reconozca su inversión significativa (€${summary.totalSpent})
2. Ofrezca acceso anticipado a nuevas funcionalidades
3. Proporcione soporte prioritario
4. Incluya invitaciones a eventos exclusivos
5. Demuestre el valor que aporta a la plataforma
6. Sea exclusivo y personalizado`,

    onboarding: `${baseData}

GENERA UN EMAIL DE ONBOARDING que:
1. Dé la bienvenida personalizada
2. Explique los próximos pasos recomendados
3. Incluya tutoriales básicos
4. Destaque casos de uso comunes
5. Ofrezca soporte proactivo
6. Motive la exploración de funcionalidades`,

    loyalty: `${baseData}

GENERA UN EMAIL DE FIDELIZACIÓN que:
1. Reconozca su actividad regular
2. Destaque su tasa de éxito (${(summary.successRate * 100).toFixed(1)}%)
3. Sugiera optimizaciones
4. Presente nuevas funcionalidades relevantes
5. Incluya casos de éxito de otros usuarios
6. Fortalezca la relación a largo plazo`
  };

  return specificPrompts[emailType as keyof typeof specificPrompts] || specificPrompts.loyalty;
}

/**
 * Obtiene metadatos del tipo de email para analytics
 */
export function getEmailTypeMetadata(emailType: string) {
  const metadata = {
    upsell: { category: 'conversion', priority: 'high', target: 'premium' },
    reengagement: { category: 'retention', priority: 'high', target: 'reactivation' },
    vip: { category: 'relationship', priority: 'high', target: 'retention' },
    onboarding: { category: 'adoption', priority: 'medium', target: 'engagement' },
    loyalty: { category: 'fidelization', priority: 'medium', target: 'retention' }
  };

  return metadata[emailType as keyof typeof metadata] || metadata.loyalty;
}


