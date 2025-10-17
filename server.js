import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Armazenar mensagens em memória (em produção, use um banco de dados)
let messageHistory = [];
let lastUpdateId = 0;
// Armazenar conversas por sessão (múltiplos usuários)
let conversations = {}; // { sessionId: { userName, userPhone, messages: [] } }
// Controle de conversa ativa (apenas 1 por vez)
let activeConversation = null; // sessionId da conversa ativa
let waitingQueue = []; // Fila de espera

app.use(express.json());
app.use(cors()); // Permitir requisições do frontend

// Funções auxiliares para comandos do Telegram
async function handleEndCommand(token, chatId) {
  if (!activeConversation) {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: '❌ Nenhuma conversa ativa no momento.',
      parse_mode: 'Markdown'
    });
    return;
  }

  const endedSession = activeConversation;
  const endedUser = conversations[endedSession];
  
  // Marcar como encerrada
  if (conversations[endedSession]) {
    conversations[endedSession].status = 'ended';
  }
  
  // Limpar conversa ativa
  activeConversation = null;
  
  // Ativar próximo da fila
  let nextUser = null;
  if (waitingQueue.length > 0) {
    const nextSession = waitingQueue.shift();
    activeConversation = nextSession;
    if (conversations[nextSession]) {
      conversations[nextSession].status = 'active';
      nextUser = conversations[nextSession];
    }
  }
  
  let message = `✅ *Conversa encerrada!*\n\n`;
  message += `👤 Encerrado: ${endedUser.userName}\n`;
  message += `📞 Telefone: ${endedUser.userPhone}\n\n`;
  
  if (nextUser) {
    message += `🔄 *Próximo da fila ativado:*\n`;
    message += `👤 ${nextUser.userName}\n`;
    message += `📞 ${nextUser.userPhone}\n`;
    message += `💬 ${nextUser.messages.length} mensagem(ns)\n\n`;
    message += `Agora você pode responder para ${nextUser.userName}!`;
  } else {
    message += `📭 Nenhuma pessoa na fila.`;
  }
  
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown'
  });
}

async function handleQueueCommand(token, chatId) {
  let message = `📋 *FILA DE ATENDIMENTO*\n\n`;
  
  if (activeConversation && conversations[activeConversation]) {
    const active = conversations[activeConversation];
    message += `🟢 *Conversa Ativa:*\n`;
    message += `👤 ${active.userName}\n`;
    message += `📞 ${active.userPhone}\n`;
    message += `💬 ${active.messages.length} mensagem(ns)\n\n`;
  } else {
    message += `🟢 Nenhuma conversa ativa\n\n`;
  }
  
  if (waitingQueue.length > 0) {
    message += `⏳ *Aguardando (${waitingQueue.length}):*\n`;
    waitingQueue.forEach((sessionId, index) => {
      const user = conversations[sessionId];
      if (user) {
        message += `${index + 1}. ${user.userName} - ${user.userPhone}\n`;
        message += `   💬 ${user.messages.length} mensagem(ns)\n`;
      }
    });
  } else {
    message += `📭 Nenhuma pessoa na fila`;
  }
  
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown'
  });
}

async function handleClearAllCommand(token, chatId) {
  const totalConversations = Object.keys(conversations).length;
  const queueLength = waitingQueue.length;
  const activeUser = activeConversation && conversations[activeConversation] 
    ? conversations[activeConversation].userName 
    : null;
  
  // Marcar todas as conversas como encerradas
  Object.keys(conversations).forEach(sessionId => {
    if (conversations[sessionId]) {
      conversations[sessionId].status = 'ended';
    }
  });
  
  // Limpar conversa ativa e fila
  activeConversation = null;
  waitingQueue = [];
  
  let message = `🧹 *TODAS AS CONVERSAS ENCERRADAS*\n\n`;
  message += `✅ Total encerrado: ${totalConversations} conversa(s)\n`;
  
  if (activeUser) {
    message += `🟢 Ativa: ${activeUser}\n`;
  }
  
  if (queueLength > 0) {
    message += `⏳ Na fila: ${queueLength} pessoa(s)\n`;
  }
  
  message += `\n📭 Sistema limpo e pronto para novos atendimentos!`;
  
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown'
  });
}

// Rota para enviar mensagem do site para o Telegram
app.post('/api/send', async (req, res) => {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const { message, userName, userPhone, sessionId, timestamp } = req.body;

  console.log('📨 Nova mensagem recebida:', { message, userName, userPhone, sessionId });

  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    return res.status(500).json({ 
      success: false, 
      error: "Variáveis de ambiente não configuradas" 
    });
  }

  if (!message) {
    return res.status(400).json({ 
      success: false, 
      error: "Mensagem não pode estar vazia" 
    });
  }

  try {
    // Criar ou atualizar conversa
    if (!conversations[sessionId]) {
      conversations[sessionId] = {
        userName: userName || 'Visitante',
        userPhone: userPhone || 'Não informado',
        messages: [],
        createdAt: Date.now(),
        status: 'waiting' // waiting, active, ended
      };
    }

    // Adicionar mensagem à conversa
    conversations[sessionId].messages.push({
      text: message,
      isUser: true,
      timestamp: timestamp || Date.now()
    });

    // Verificar se há conversa ativa
    let messageStatus = '';
    let isFirstMessage = conversations[sessionId].messages.length === 1;
    let shouldNotifyUser = false;
    let userPosition = 0;
    
    if (!activeConversation && isFirstMessage) {
      // Primeira mensagem e nenhuma conversa ativa - ativar esta
      activeConversation = sessionId;
      conversations[sessionId].status = 'active';
      messageStatus = '🟢 *CONVERSA ATIVA* - Você pode responder agora!';
    } else if (activeConversation === sessionId) {
      // Continuação da conversa ativa
      messageStatus = '🟢 *CONVERSA ATIVA*';
    } else if (activeConversation && activeConversation !== sessionId) {
      // Há outra conversa ativa - colocar na fila
      if (!waitingQueue.includes(sessionId)) {
        waitingQueue.push(sessionId);
      }
      conversations[sessionId].status = 'waiting';
      const position = waitingQueue.indexOf(sessionId) + 1;
      userPosition = position;
      shouldNotifyUser = true;
      messageStatus = `⏳ *NA FILA* - Posição: ${position}\n_Esta pessoa está aguardando. Encerre a conversa atual para atendê-la._`;
    }

    // Formatar mensagem para o Telegram com identificação única
    const formattedMessage = `
💬 *NOVA MENSAGEM*

${messageStatus}

👤 *Nome:* ${userName || 'Visitante'}
📞 *Telefone:* ${userPhone || 'Não informado'}
🆔 *ID:* \`${sessionId}\`
📅 *Data:* ${new Date(timestamp).toLocaleString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━
📝 *MENSAGEM:*
${message}
━━━━━━━━━━━━━━━━━━━━

💡 *Comandos:*
• Responda normalmente para continuar
• \`/encerrar\` - Finaliza e atende próximo da fila
• \`/fila\` - Ver quem está esperando
• \`/limpar\` - Encerra TODAS as conversas
    `.trim();

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: formattedMessage,
        parse_mode: 'Markdown'
      }
    );

    // Salvar mensagem no histórico geral
    messageHistory.push({
      id: Date.now(),
      text: message,
      isUser: true,
      timestamp: timestamp || Date.now(),
      userName: userName || 'Visitante',
      userPhone: userPhone || 'Não informado',
      sessionId: sessionId
    });

    // Se o usuário está na fila, enviar notificação para ele
    let queueNotification = null;
    if (shouldNotifyUser && userPosition > 0) {
      const queueMessage = `⏳ Você está na fila de atendimento!\n\n📍 Posição: ${userPosition}\n\n⏰ Aguarde, em breve você será atendido.`;
      
      // Adicionar mensagem automática à conversa
      conversations[sessionId].messages.push({
        text: queueMessage,
        isUser: false,
        timestamp: Date.now(),
        isSystemMessage: true
      });
      
      queueNotification = queueMessage;
    }

    return res.status(200).json({ 
      success: true, 
      message: "Mensagem enviada com sucesso!",
      queueNotification: queueNotification,
      queuePosition: userPosition > 0 ? userPosition : null
    });
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: "Falha no envio da mensagem",
      details: error.response?.data || error.message
    });
  }
});

// Rota para buscar novas mensagens do Telegram (respostas para o usuário)
app.get('/api/messages', async (req, res) => {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const sessionId = req.query.sessionId;

  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    return res.status(500).json({ 
      success: false, 
      error: "Variáveis de ambiente não configuradas" 
    });
  }

  try {
    // Buscar atualizações do Telegram
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`,
      {
        params: {
          offset: lastUpdateId + 1,
          timeout: 30
        }
      }
    );

    const updates = response.data.result || [];
    const newMessages = [];

    for (const update of updates) {
      if (update.message && update.message.chat.id.toString() === CHAT_ID) {
        const msg = update.message;
        
        // Atualizar lastUpdateId
        if (update.update_id > lastUpdateId) {
          lastUpdateId = update.update_id;
        }

        // Adicionar mensagem ao histórico se não for do bot
        if (!msg.from.is_bot && msg.text) {
          // Processar comandos
          if (msg.text.startsWith('/encerrar')) {
            await handleEndCommand(TELEGRAM_TOKEN, CHAT_ID);
            continue;
          }
          
          if (msg.text.startsWith('/fila')) {
            await handleQueueCommand(TELEGRAM_TOKEN, CHAT_ID);
            continue;
          }
          
          if (msg.text.startsWith('/limpar')) {
            await handleClearAllCommand(TELEGRAM_TOKEN, CHAT_ID);
            continue;
          }

          // Enviar para a conversa ativa (não importa o sessionId da requisição)
          const targetSession = activeConversation || sessionId;
          
          const newMsg = {
            id: msg.message_id,
            text: msg.text,
            isUser: false, // É uma resposta do Murilo
            timestamp: msg.date * 1000,
            userName: msg.from.first_name,
            sessionId: targetSession
          };
          
          // Adicionar à conversa ativa
          if (targetSession && conversations[targetSession]) {
            conversations[targetSession].messages.push({
              text: msg.text,
              isUser: false,
              timestamp: msg.date * 1000
            });
            
            console.log(`✅ Mensagem adicionada à conversa de ${conversations[targetSession].userName}`);
          }
          
          messageHistory.push(newMsg);
          
          // Só retornar mensagem se for para a sessão que está pedindo
          if (targetSession === sessionId) {
            newMessages.push(newMsg);
          }
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      messages: newMessages,
      totalMessages: messageHistory.length
    });
  } catch (error) {
    console.error("❌ Erro ao buscar mensagens:", error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: "Falha ao buscar mensagens",
      details: error.response?.data || error.message
    });
  }
});

// Rota para encerrar conversa e atender próximo da fila
app.post('/api/end-conversation', (req, res) => {
  if (!activeConversation) {
    return res.status(400).json({
      success: false,
      message: 'Nenhuma conversa ativa no momento'
    });
  }

  const endedSession = activeConversation;
  const endedUser = conversations[endedSession];

  // Marcar como encerrada
  if (conversations[endedSession]) {
    conversations[endedSession].status = 'ended';
  }

  // Limpar conversa ativa
  activeConversation = null;

  // Ativar próximo da fila
  let nextUser = null;
  if (waitingQueue.length > 0) {
    const nextSession = waitingQueue.shift();
    activeConversation = nextSession;
    if (conversations[nextSession]) {
      conversations[nextSession].status = 'active';
      nextUser = conversations[nextSession];
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Conversa encerrada',
    endedUser: endedUser ? endedUser.userName : null,
    nextUser: nextUser ? nextUser.userName : null,
    queueLength: waitingQueue.length
  });
});

// Rota para ver fila de espera
app.get('/api/queue', (req, res) => {
  const queue = waitingQueue.map((sessionId, index) => ({
    position: index + 1,
    sessionId,
    userName: conversations[sessionId]?.userName || 'Desconhecido',
    userPhone: conversations[sessionId]?.userPhone || 'Não informado',
    messageCount: conversations[sessionId]?.messages.length || 0
  }));

  return res.status(200).json({
    success: true,
    activeConversation: activeConversation ? {
      sessionId: activeConversation,
      userName: conversations[activeConversation]?.userName,
      userPhone: conversations[activeConversation]?.userPhone
    } : null,
    queue: queue,
    queueLength: queue.length
  });
});

// Rota para listar conversas ativas
app.get('/api/conversations', (req, res) => {
  const activeConversations = Object.keys(conversations).map(sessionId => ({
    sessionId,
    userName: conversations[sessionId].userName,
    userPhone: conversations[sessionId].userPhone,
    messageCount: conversations[sessionId].messages.length,
    lastMessage: conversations[sessionId].messages[conversations[sessionId].messages.length - 1],
    createdAt: conversations[sessionId].createdAt,
    status: conversations[sessionId].status
  }));

  return res.status(200).json({ 
    success: true, 
    conversations: activeConversations,
    total: activeConversations.length,
    activeConversation: activeConversation
  });
});

// Rota para obter histórico completo
app.get('/api/history', (req, res) => {
  return res.status(200).json({ 
    success: true, 
    messages: messageHistory
  });
});

// Rota para limpar histórico (útil para desenvolvimento)
app.delete('/api/history', (req, res) => {
  messageHistory = [];
  return res.status(200).json({ 
    success: true, 
    message: "Histórico limpo com sucesso"
  });
});

app.get('/api/send', async (req, res) => {
  // Redireciona GET para POST
  return app._router.handle({ ...req, method: 'POST' }, res);
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 API disponível em http://localhost:${PORT}/api/send`);
  console.log(`💬 Chat API disponível em http://localhost:${PORT}/api/messages`);
});
