# 🤖 Bot Automático do Telegram

Bot de automação que envia mensagens automáticas para o Telegram, usando Vue.js no frontend e backend serverless na Vercel.

## 🎯 Objetivo

Demonstrar habilidades em:
- ✅ Integração com APIs externas (Telegram Bot API)
- ✅ Backend serverless com Vercel
- ✅ Frontend moderno com Vue.js
- ✅ Automação com Cron Jobs
- ✅ Deploy em nuvem

## 🚀 Funcionalidades

- **Envio manual**: Interface Vue.js com botão para enviar mensagens
- **Envio automático**: Cron job que envia mensagens diariamente às 12h UTC (09h BRT)
- **API serverless**: Backend rodando na Vercel sem necessidade de servidor

## 📋 Pré-requisitos

- Node.js 18 ou superior
- Conta no Telegram
- Conta na Vercel (gratuita)
- Conta no GitHub

## 🛠️ Configuração

### 1. Criar o Bot no Telegram

1. Abra o Telegram e procure por `@BotFather`
2. Envie o comando `/newbot`
3. Dê um nome para o bot (ex: Bot do Murilo)
4. Dê um username (ex: murilo_bot)
5. Guarde o **TOKEN** que o BotFather fornecer

### 2. Obter o Chat ID

1. Envie uma mensagem para o seu bot no Telegram
2. Acesse no navegador (substituindo pelo seu token):
   ```
   https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
   ```
3. Procure por `"chat": { "id": 123456789 }`
4. Guarde esse **CHAT_ID**

### 3. Instalar Dependências

```bash
# Instalar dependências do backend
npm install

# Instalar dependências do frontend
cd frontend
npm install
cd ..
```

### 4. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (use `.env.example` como base):

```env
TELEGRAM_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui
```

## 🏃 Executar Localmente

```bash
# Rodar o frontend
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

## 📦 Deploy na Vercel

### 1. Subir para o GitHub

```bash
git init
git add .
git commit -m "Bot Telegram Automático"
git branch -M main
git remote add origin https://github.com/seu-usuario/telegram-bot-portfolio.git
git push -u origin main
```

## 📁 Estrutura do Projeto

```
telegram-bot-portfolio/
│
├── api/
│   └── send.js              # Rota serverless para enviar mensagens
│
├── frontend/
│   ├── src/
│   │   ├── App.vue          # Componente principal
│   │   ├── main.js          # Entry point
│   │   └── style.css        # Estilos globais
│   ├── index.html           # HTML base
│   ├── package.json         # Dependências do frontend
│   └── vite.config.js       # Configuração do Vite
│
├── .env.example             # Exemplo de variáveis de ambiente
├── .gitignore               # Arquivos ignorados pelo Git
├── package.json             # Dependências do backend
├── vercel.json              # Configuração da Vercel + Cron
└── README.md                # Este arquivo
```

## 🔧 Tecnologias Utilizadas

- **Frontend**: Vue.js 3 + Vite
- **Backend**: Node.js 18 + Vercel Serverless Functions
- **API**: Telegram Bot API
- **Deploy**: Vercel
- **Automação**: Vercel Cron Jobs

## 📝 Como Funciona

1. O usuário acessa a interface Vue.js
2. Ao clicar no botão, uma requisição é feita para `/api/send`
3. A função serverless chama a API do Telegram
4. A mensagem é enviada para o chat configurado
5. Além disso, o cron job executa automaticamente todos os dias

## 🎓 Aprendizados

Este projeto demonstra:
- Integração com APIs REST externas
- Uso de variáveis de ambiente seguras
- Desenvolvimento fullstack com Vue + Node
- Deploy de aplicações serverless
- Automação com cron jobs na nuvem

## 📄 Licença

MIT

## 👤 Autor

**Murilo**

---

⭐ Se este projeto foi útil, deixe uma estrela no GitHub!
