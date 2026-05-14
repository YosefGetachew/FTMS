const nodemailer =
  require('nodemailer');

const transporter =
  nodemailer.createTransport({

    host: 'smtp.gmail.com',

    port: 587,

    secure: false,

    auth: {

      user:
        process.env.EMAIL_USER,

      pass:
        process.env.EMAIL_PASS,
    },
  });

transporter.verify(
  function (error, success) {

    if (error) {

      console.log(
        'EMAIL ERROR:',
        error.message
      );

    } else {

      console.log(
        'EMAIL SERVER READY'
      );
    }
  }
);

module.exports = transporter;