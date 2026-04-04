const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above with WhatsApp');
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('msessage', async (msg) => {
    console.log("got a msg")
    if (msg.body === '!!') {
        msg.reply('hello world');
    }
});

client.initialize();
