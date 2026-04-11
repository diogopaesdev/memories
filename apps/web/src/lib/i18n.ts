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
    "login.title": "Bem-vindo ao Memories",
    "login.subtitle": "Capture memórias de projeto por voz, organizadas e compartilhadas com seu time",
    "login.card-title": "Entrar na sua conta",
    "login.card-desc": "Use sua conta Google para acessar o painel",
    "login.button": "Continuar com Google",
    "login.signing-in": "Entrando...",
    "login.terms": "Ao entrar, você concorda com os termos de uso da plataforma.",

    // Download
    "download.badge": "App Desktop — Capture memórias por voz",
    "download.title": "Memories",
    "download.title-accent": "Desktop",
    "download.description": "Grave memórias de projeto direto pelo microfone. O app fica na bandeja do sistema e converte sua voz em registros estruturados automaticamente.",
    "download.no-release": "Nenhuma versão publicada ainda.",
    "download.version": "Versão atual:",
    "download.installer": "Instalador",
    "download.portable": "Versão portátil",
    "download.coming-soon": "Em breve",
    "download.feature1.title": "Captura por voz",
    "download.feature1.desc": "Grave o que você fez com atalho global Ctrl+Shift+R, sem abrir o app.",
    "download.feature2.title": "IA estrutura o texto",
    "download.feature2.desc": "A transcrição é processada e formatada em memória com título e contexto.",
    "download.feature3.title": "Sincroniza com o painel",
    "download.feature3.desc": "As memórias aparecem instantaneamente no painel web vinculadas ao projeto.",

    // Theme
    "theme.light": "Claro",
    "theme.dark": "Escuro",
    "theme.system": "Sistema",

    // Language
    "lang.pt": "Português",
    "lang.en": "English",
  },
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
    "login.title": "Welcome to Memories",
    "login.subtitle": "Capture project memories by voice, organized and shared with your team",
    "login.card-title": "Sign in to your account",
    "login.card-desc": "Use your Google account to access the dashboard",
    "login.button": "Continue with Google",
    "login.signing-in": "Signing in...",
    "login.terms": "By signing in, you agree to our terms of service.",

    // Download
    "download.badge": "Desktop App — Capture memories by voice",
    "download.title": "Memories",
    "download.title-accent": "Desktop",
    "download.description": "Record project memories through your microphone. The app sits in your system tray and automatically converts your voice into structured records.",
    "download.no-release": "No version published yet.",
    "download.version": "Current version:",
    "download.installer": "Installer",
    "download.portable": "Portable version",
    "download.coming-soon": "Coming soon",
    "download.feature1.title": "Voice capture",
    "download.feature1.desc": "Record what you did with the global shortcut Ctrl+Shift+R, without opening the app.",
    "download.feature2.title": "AI structures the text",
    "download.feature2.desc": "The transcription is processed and formatted into a memory with title and context.",
    "download.feature3.title": "Syncs with dashboard",
    "download.feature3.desc": "Memories appear instantly in the web dashboard linked to the project.",

    // Theme
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",

    // Language
    "lang.pt": "Português",
    "lang.en": "English",
  },
} as const

export type Lang = keyof typeof translations
export type TranslationKey = keyof typeof translations.pt
