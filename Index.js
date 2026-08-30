const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const usuarios = {};

async function conectarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('sessao_whatsapp');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('🤖 QR CODE DETECTADO! Escaneie o código abaixo com o seu WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const deveriaReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔄 Conexão fechada. Tentando reconectar...', deveriaReconectar);
            if (deveriaReconectar) conectarWhatsApp();
        } else if (connection === 'open') {
            console.log('🚀 O Robô está online e pronto na Nuvem com Baileys!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const de = msg.key.remoteJid;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

        // Ignora grupos
        if (de.endsWith('@g.us')) return;

        if (!usuarios[de]) {
            usuarios[de] = { etapa: 'menu' };
        }

        const estado = usuarios[de];

        const enviarTexto = async (txt) => {
            await sock.sendMessage(de, { text: txt });
        };

        if (estado.etapa === 'menu') {
            if (texto === '2') {
                estado.etapa = 'agendamento_dia';
                await enviarTexto('📅 Perfeito! Para qual *dia da semana* você deseja agendar?\n\nDigite o número:\n1️⃣ — Segunda-feira\n2️⃣ — Terça-feira\n3️⃣ — Quarta-feira\n4️⃣ — Quinta-feira\n5️⃣ — Sexta-feira');
            } else {
                await enviarTexto('👋 Olá! Seja bem-vindo ao nosso atendimento automático.\n\nPor favor, escolha uma das opções abaixo digitando apenas o número:\n\n1️⃣ — Comprar um produto (Vendas)\n2️⃣ — Agendar um horário\n3️⃣ — Suporte técnico');
            }
            return;
        }

        if (estado.etapa === 'agendamento_dia') {
            const dias = { '1': 'Segunda-feira', '2': 'Terça-feira', '3': 'Quarta-feira', '4': 'Quinta-feira', '5': 'Sexta-feira' };
            
            if (dias[texto]) {
                estado.diaEscolhido = dias[texto];
                estado.etapa = 'agendamento_hora';
                await enviarTexto(`Você escolheu *${estado.diaEscolhido}*.\n\nAgora, escolha o melhor *horário*:\n\n1️⃣ — 09:00\n2️⃣ — 14:00\n3️⃣ — 16:00`);
            } else {
                await enviarTexto('❌ Opção inválida. Digite de 1 a 5 para escolher o dia.');
            }
            return;
        }

        if (estado.etapa === 'agendamento_hora') {
            const horas = { '1': '09:00', '2': '14:00', '3': '16:00' };

            if (horas[texto]) {
                estado.horaEscolhida = horas[texto];
                await enviarTexto(`✅ *Agendamento Confirmado!*\n\n📅 Dia: ${estado.diaEscolhido}\n⏰ Horário: ${estado.horaEscolhida}\n\nMuito obrigado! Caso precise alterar, entre em contato com o suporte.`);
                delete usuarios[de];
            } else {
                await enviarTexto('❌ Opção inválida. Digite de 1 a 3 para escolher o horário.');
            }
            return;
        }
    });
}

conectarWhatsApp();
