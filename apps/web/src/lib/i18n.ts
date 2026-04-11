export const translations = {
  pt: {
    // Header
    "teams": "Times",
    "new-team": "Novo time",
    "invite-to": "Convidar para",
    "sign-out": "Sair",
    "cancel": "Cancelar",
    "create": "Criar",
    "creating": "Criando...",
    "send": "Convidar",
    "sending": "Enviando...",
    "team-name": "Nome do time",
    "team-name-placeholder": "Ex: Marketing, Engenharia...",
    "email": "Email",
    "email-placeholder": "colega@empresa.com",
    "invite-title": "Convidar para",
    "new-team-title": "Novo time",
    "toast-team-created": "Time criado!",
    "toast-team-error": "Erro ao criar time.",
    "toast-invite-sent": "Convite enviado!",
    "toast-invite-error": "Erro ao enviar convite.",

    // Login
    "login.card-title": "Entrar na sua conta",
    "login.card-desc": "Use sua conta Google para acessar o painel",
    "login.button": "Continuar com Google",
    "login.signing-in": "Entrando...",
    "login.terms": "Ao entrar, você concorda com os termos de uso da plataforma.",

    // Dashboard — Memories page
    "memories.workspace": "Workspace",
    "memories.title": "Memórias",
    "memories.subtitle": "Tudo que você registrou por voz — organizado automaticamente",
    "memories.new": "Nova Memória",
    "memories.empty.title": "Nenhuma memória ainda",
    "memories.empty.desc": "Use o app desktop para gravar o que fez. A IA organiza e categoriza automaticamente.",

    // Stats
    "stats.projects": "Projetos",
    "stats.memories": "Memórias",
    "stats.by-voice": "Por voz",

    // Project list
    "project.memory": "memória",
    "project.memories": "memórias",

    // Project detail
    "project.back": "Memórias",
    "project.by-voice": "por voz",
    "project.created": "Criado em",
    "project.records-section": "Registros",

    // Reports list
    "report.empty.title": "Nenhum registro ainda",
    "report.empty.desc": "Crie um registro manualmente ou use o app desktop para gravar por voz",
    "report.published": "Publicado",
    "report.draft": "Rascunho",
    "report.voice": "Por voz",
    "report.manual": "Manual",
    "report.transcript": "Transcrição original",
    "report.created": "Criado em",

    // Theme
    "theme.light": "Claro",
    "theme.dark": "Escuro",
    "theme.system": "Sistema",

    // Lang
    "lang.pt": "Português",
    "lang.en": "English",
  } satisfies Record<string, string>,

  en: {
    // Header
    "teams": "Teams",
    "new-team": "New team",
    "invite-to": "Invite to",
    "sign-out": "Sign out",
    "cancel": "Cancel",
    "create": "Create",
    "creating": "Creating...",
    "send": "Invite",
    "sending": "Sending...",
    "team-name": "Team name",
    "team-name-placeholder": "e.g. Marketing, Engineering...",
    "email": "Email",
    "email-placeholder": "colleague@company.com",
    "invite-title": "Invite to",
    "new-team-title": "New team",
    "toast-team-created": "Team created!",
    "toast-team-error": "Error creating team.",
    "toast-invite-sent": "Invite sent!",
    "toast-invite-error": "Error sending invite.",

    // Login
    "login.card-title": "Sign in to your account",
    "login.card-desc": "Use your Google account to access the dashboard",
    "login.button": "Continue with Google",
    "login.signing-in": "Signing in...",
    "login.terms": "By signing in, you agree to our terms of service.",

    // Dashboard — Memories page
    "memories.workspace": "Workspace",
    "memories.title": "Memories",
    "memories.subtitle": "Everything you recorded by voice — organized automatically",
    "memories.new": "New Memory",
    "memories.empty.title": "No memories yet",
    "memories.empty.desc": "Use the desktop app to record what you did. AI organizes and categorizes automatically.",

    // Stats
    "stats.projects": "Projects",
    "stats.memories": "Memories",
    "stats.by-voice": "By voice",

    // Project list
    "project.memory": "memory",
    "project.memories": "memories",

    // Project detail
    "project.back": "Memories",
    "project.by-voice": "by voice",
    "project.created": "Created on",
    "project.records-section": "Records",

    // Reports list
    "report.empty.title": "No records yet",
    "report.empty.desc": "Create a record manually or use the desktop app to record by voice",
    "report.published": "Published",
    "report.draft": "Draft",
    "report.voice": "Voice",
    "report.manual": "Manual",
    "report.transcript": "Original transcript",
    "report.created": "Created on",

    // Theme
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",

    // Lang
    "lang.pt": "Português",
    "lang.en": "English",
  } satisfies Record<string, string>,
}

export type Lang = "pt" | "en"
export type TranslationKey = keyof typeof translations.pt
