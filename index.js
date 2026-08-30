const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Necessário para rodar na nuvem
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('🤖 QR CODE DETECTADO! Escaneie o código abaixo com o seu WhatsApp:');
});

client.on('ready', () => {
    console.log('🚀 O Robô está online e pronto na Nuvem!');
});

const usuarios = {};

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const de = msg.from;
    const texto = msg.body.trim();

    if (chat.isGroup) return;

    if (!usuarios[de]) {
        usuarios[de] = { etapa: 'menu' };
    }

    const estado = usuarios[de];

    if (estado.etapa === 'menu') {
        if (texto === '2') {
            estado.etapa = 'agendamento_dia';
            await msg.reply('📅 Perfeito! Para qual *dia da semana* você deseja agendar?\n\nDigite o número:\n1️⃣ — Segunda-feira\n2️⃣ — Terça-feira\n3️⃣ — Quarta-feira\n4️⃣ — Quinta-feira\n5️⃣ — Sexta-feira');
        } else {
            await msg.reply('👋 Olá! Seja bem-vindo ao nosso atendimento automático.\n\nPor favor, escolha uma das opções abaixo digitando apenas o número:\n\n1️⃣ — Comprar um produto (Vendas)\n2️⃣ — Agendar um horário\n3️⃣ — Suporte técnico');
        }
        return;
    }

    if (estado.etapa === 'agendamento_dia') {
        const dias = { '1': 'Segunda-feira', '2': 'Terça-feira', '3': 'Quarta-feira', '4': 'Quinta-feira', '5': 'Sexta-feira' };
        
        if (dias[texto]) {
            estado.diaEscolhido = dias[texto];
            estado.etapa = 'agendamento_hora';
            await msg.reply(`Você escolheu *${estado.diaEscolhido}*.\n\nAgora, escolha o melhor *horário*:\n\n1️⃣ — 09:00\n2️⃣ — 14:00\n3️⃣ — 16:00`);
        } else {
            await msg.reply('❌ Opção inválida. Digite de 1 a 5 para escolher o dia.');
        }
        return;
    }

    if (estado.etapa === 'agendamento_hora') {
        const horas = { '1': '09:00', '2': '14:00', '3': '16:00' };

        if (horas[texto]) {
            estado.horaEscolhida = horas[texto];
            await msg.reply(`✅ *Agendamento Confirmado!*\n\n📅 Dia: ${estado.diaEscolhido}\n⏰ Horário: ${estado.horaEscolhida}\n\nMuito obrigado! Caso precise alterar, entre em contato com o suporte.`);
            delete usuarios[de];
        } else {
            await msg.reply('❌ Opção inválida. Digite de 1 a 3 para escolher o horário.');
        }
        return;
    }
});

client.initialize();
