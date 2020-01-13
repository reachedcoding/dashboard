let ejs = require('ejs');
var path = require('path');

module.exports = class EmailClient {
    constructor(apiKey) {
        this.sgMail = require('@sendgrid/mail');
        this.sgMail.setApiKey(apiKey);
    }

    async sendMail(toAddress, fromAddress, token, client) {
        let html = await ejs.renderFile(path.join(__dirname, 'site/dashboard/pages/test.ejs'), {
            token: token,
            hostname: client.hostname
        });
        const msg = {
            to: toAddress,
            from: fromAddress,
            subject: 'Your latest purchase',
            html: html,
          };
          this.sgMail.send(msg);
    }
}
