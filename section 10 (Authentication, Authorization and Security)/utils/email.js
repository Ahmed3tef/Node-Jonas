const nodemailer = require('nodemailer');

const sendEmail = async options => {
  // 1- create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2- define email options

  const mailOptions = {
    from: 'name <email@example.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };
  // 3- send email
  await transporter.sendMail(mailOptions); // this returns a promise
};

module.exports = sendEmail;
