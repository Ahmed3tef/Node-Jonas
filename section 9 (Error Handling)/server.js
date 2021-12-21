const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('Uncaught exception! Shuting down ...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
//connect method returns a promise
mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then(con => {
    console.log('connection was successful');
  });

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', err => {
  console.log('unhandled Rejection! Shuting down ...');
  console.log(err.name, err.message);
  process.exit(1);
});
