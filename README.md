# ProjectsReport

Gestão de relatórios com painel web + captura por voz via app desktop.

## Stack

- **Web**: Next.js 15, Better Auth, Firebase Admin, Shadcn/ui, React Hook Form, Zod
- **Desktop**: Electron, React, Web Speech API
- **Monorepo**: Turborepo + npm workspaces

## Estrutura

```
projectsreport/
├── apps/
│   ├── web/        # Next.js (painel web)
│   └── desktop/    # Electron (app de voz)
├── packages/
│   └── shared/     # Tipos TypeScript compartilhados
├── turbo.json
└── package.json
```

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example apps/web/.env.local
# Edite apps/web/.env.local com suas credenciais

# 3. Rodar em dev
npm run dev:web      # painel web em localhost:3000
npm run dev:desktop  # app electron
```

## Pré-requisitos

- Node.js >= 20
- Projeto Firebase com Firestore habilitado
- Google OAuth 2.0 configurado no Google Cloud Console
- (Opcional) OpenAI API key para processamento inteligente de voz
