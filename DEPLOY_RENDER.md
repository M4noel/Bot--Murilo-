# 🚀 Deploy do Bot no Render

## ✅ Problema Resolvido!

O `package.json` foi corrigido. Agora você pode fazer deploy no Render.

## 📋 Passo a Passo para Deploy:

### 1️⃣ Commit e Push das Mudanças

```bash
cd c:\Users\Murilo\Desktop\bot-automatico

git add .
git commit -m "Fix: Corrigir package.json para deploy no Render"
git push origin master
```

### 2️⃣ Configurar no Render

1. **Acesse:** https://render.com
2. **Clique em:** "New +" → "Web Service"
3. **Conecte seu repositório:** `M4noel/Bot--Murilo-`
4. **Configure:**

```
Name: telegram-bot-portfolio
Region: Ohio (US East)
Branch: master
Root Directory: (deixe vazio)
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### 3️⃣ Adicionar Variáveis de Ambiente

No Render, vá em **Environment** e adicione:

```
TELEGRAM_TOKEN=seu_token_do_botfather
TELEGRAM_CHAT_ID=seu_chat_id
PORT=3000
```

### 4️⃣ Deploy!

Clique em **"Create Web Service"**

---

## ⚙️ Configurações Importantes:

### package.json (já corrigido):
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  }
}
```

### Porta Dinâmica:

O Render usa porta dinâmica. Atualize o `server.js`:

```javascript
const PORT = process.env.PORT || 3000;
```

---

## 🔧 Se Ainda Der Erro:

### Erro: "Can't cd to frontend"
✅ **Resolvido!** O package.json foi corrigido.

### Erro: "Module not found"
```bash
# Certifique-se que package.json tem todas as dependências
npm install
```

### Erro: "TELEGRAM_TOKEN is not defined"
```bash
# Adicione as variáveis de ambiente no Render
# Environment → Add Environment Variable
```

---

## 📡 Após Deploy:

### URL do Bot:
```
https://seu-bot.onrender.com
```

### Testar API:
```
https://seu-bot.onrender.com/api/send
https://seu-bot.onrender.com/api/messages
https://seu-bot.onrender.com/api/queue
```

### Atualizar Frontend:

No arquivo `useChat.js` do frontend, mude:

```javascript
// De:
const API_URL = 'http://localhost:3000';

// Para:
const API_URL = import.meta.env.VITE_BOT_API_URL || 'https://seu-bot.onrender.com';
```

E crie `.env` no frontend:
```env
VITE_BOT_API_URL=https://seu-bot.onrender.com
```

---

## ✅ Checklist de Deploy:

- [ ] `package.json` corrigido
- [ ] Commit e push para GitHub
- [ ] Render conectado ao repositório
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Bot respondendo na URL do Render
- [ ] Frontend atualizado com nova URL

---

## 🎉 Pronto!

Agora seu bot está rodando no Render 24/7!

**Importante:** O Render pode dormir após 15 minutos de inatividade no plano gratuito. Para manter ativo, considere:
- Upgrade para plano pago
- Usar um serviço de ping (como UptimeRobot)

---

*Deploy configurado em 17/10/2025* 🚀
