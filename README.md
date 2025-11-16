# Avocat LegalTech v3

Una plataforma LegalTech moderna construida con Next.js 14, Firebase e integración de IA, diseñada para revolucionar la práctica legal con herramientas inteligentes y flujos de trabajo.

## 🚀 Características

- **Análisis de Documentos con IA**: Análisis inteligente y análisis de documentos legales
- **Asistente de Investigación Legal**: Investigación legal impulsada por IA y análisis de jurisprudencia
- **Resúmenes de Casos**: Generación automatizada de resúmenes concisos de casos
- **Gestión de Clientes**: Portal integral de clientes con intercambio seguro de documentos
- **Análisis e Informes**: Información avanzada sobre el rendimiento de casos y métricas de negocio
- **Seguridad Empresarial**: Seguridad de nivel bancario con estándares de cumplimiento
- **Integración con Stripe**: Procesamiento de pagos sin problemas y gestión de suscripciones

## 🏗️ Arquitectura

### Stack Tecnológico

| Capa | Tecnología | Descripción |
|-------|------------|-------------|
| **Frontend** | Next.js 14+ (App Router) | Soporte SSR/CSR con `use client` y diseño responsivo con Tailwind |
| **Estilos** | Tailwind CSS | Diseño moderno y responsivo fácil de extender |
| **Constructor de UI** | Cursor + Figma | Desarrollo asistido por IA y diseño rápido |
| **Backend** | Firebase Functions (Node.js) | API serverless para auth, DB, IA y webhooks de Stripe |
| **Base de Datos** | Firestore (NoSQL) | Base de datos cloud serverless con 50k lecturas gratuitas/día |
| **Autenticación** | Firebase Auth | Soporte para login con email y Google |
| **Hosting** | Firebase Hosting | HTTPS gratuito y CI/CD desde GitHub |
| **IA** | OpenAI GPT-4o (API) | Generación de demanda, resúmenes de casos, análisis legal |
| **Pagos** | Stripe + Tabla de Precios | Checkout, suscripciones, gestión de clientes |
| **Almacenamiento** | Cloud Storage (Firebase) | Carga de documentos y PDFs generados |

## 🛠️ Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Proyecto de Firebase
- Cuenta de Stripe
- Clave API de OpenAI

## 📦 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/andreslevano/avocatapp_legaltech_v3.git
   cd avocatapp_legaltech_v3
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configuración del entorno**
   ```bash
   cp env.example .env.local
   ```
   
   Completa tus variables de entorno en `.env.local`:
   - Configuración de Firebase
   - Claves API de Stripe
   - Clave API de OpenAI

4. **Ejecutar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

5. **Abrir tu navegador**
   Navega a [http://localhost:3000](http://localhost:3000)

## 🔧 Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Iniciar servidor de producción
- `npm run lint` - Ejecutar ESLint
- `npm run type-check` - Ejecutar verificación de tipos de TypeScript

## 📁 Estructura del Proyecto

```
avocat-legaltech-v3/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx      # Layout raíz
│   │   └── page.tsx        # Página principal
│   ├── components/          # Componentes React
│   │   ├── Header.tsx      # Encabezado de navegación
│   │   ├── Hero.tsx        # Sección hero del landing
│   │   ├── Features.tsx    # Muestra de características
│   │   ├── Pricing.tsx     # Planes de precios
│   │   └── Footer.tsx      # Pie de página del sitio
│   ├── lib/                # Bibliotecas de utilidades
│   │   ├── firebase.ts     # Configuración de Firebase
│   │   ├── stripe.ts       # Integración de Stripe
│   │   └── openai.ts       # Servicios de IA de OpenAI
│   ├── types/              # Definiciones de tipos de TypeScript
│   └── styles/             # Estilos globales y Tailwind
├── public/                 # Activos estáticos
├── .env.local              # Variables de entorno
├── tailwind.config.js      # Configuración de Tailwind CSS
├── next.config.js          # Configuración de Next.js
├── tsconfig.json           # Configuración de TypeScript
└── package.json            # Dependencias y scripts
```

## 🔐 Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```bash
# Configuración de Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=tu_clave_api_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_id_proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=tu_measurement_id

# Configuración de Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publicable_stripe
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_stripe
STRIPE_WEBHOOK_SECRET=whsec_tu_secreto_webhook

# Configuración de OpenAI
# (solo servidor; no la expongas en el cliente)
OPENAI_API_KEY=sk-tu_clave_api_openai

# Configuración de la App
NEXTAUTH_SECRET=tu_secreto_nextauth
NEXTAUTH_URL=http://localhost:3000
```

> ℹ️ **Backend (Cloud Functions)**: además de definir `OPENAI_API_KEY` en tu `.env.local`, registra el secreto para Functions con:
> ```bash
> firebase functions:config:set openai.key="sk-..." 
> firebase deploy --only functions
> ```
> También puedes almacenarlo en Google Secret Manager y referenciarlo desde `firebase-functions/params` si prefieres rotación automática.

## 🚀 Despliegue

### Firebase Hosting

1. **Construir el proyecto**
   ```bash
   npm run build
   ```

2. **Desplegar a Firebase**
   ```bash
   firebase deploy
   ```

### Vercel

1. **Conectar tu repositorio de GitHub a Vercel**
2. **Establecer variables de entorno en el dashboard de Vercel**
3. **Desplegar automáticamente al hacer push a la rama principal**

## 🔒 Características de Seguridad

- Autenticación de Firebase con email y OAuth de Google
- Control de acceso basado en roles
- Encriptación de extremo a extremo para datos sensibles
- Cumplimiento GDPR
- Endpoints de API seguros con validación adecuada

## 🤝 Contribuir

1. Haz fork del repositorio
2. Crea una rama de características (`git checkout -b feature/caracteristica-increible`)
3. Haz commit de tus cambios (`git commit -m 'Agregar característica increíble'`)
4. Haz push a la rama (`git push origin feature/caracteristica-increible`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

- **Documentación**: [Wiki del Proyecto](https://github.com/andreslevano/avocatapp_legaltech_v3/wiki)
- **Problemas**: [GitHub Issues](https://github.com/andreslevano/avocatapp_legaltech_v3/issues)
- **Email**: soporte@avocat-legaltech.com

## 🙏 Agradecimientos

- Construido con [Next.js](https://nextjs.org/)
- Estilizado con [Tailwind CSS](https://tailwindcss.com/)
- Impulsado por [Firebase](https://firebase.google.com/)
- Capacidades de IA por [OpenAI](https://openai.com/)
- Pagos por [Stripe](https://stripe.com/)

---

**Construido con ❤️ por [Andres Levano](https://github.com/andreslevano)**
