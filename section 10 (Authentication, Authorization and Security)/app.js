const express = require('express');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const AppError = require('./utils/appError');
const app = express();

// Global MIDDLEWARES

// set security HTTP handlers.
app.use(helmet());

// development logging.
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// this limiter is a middleware function.
// limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour.',
});
// will affect on routes starts with /api
app.use('/api', limiter);

// body parser, reading data from body into req.body.
app.use(express.json({ limit: '10kb' }));

// data sanitization against noSQL data injection
app.use(mongoSanitize());
// data sanitization against XSS
app.use(xss());
// prevent params pollution.
app.use(
  hpp({
    whitelist: [
      'price',
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'difficulty',
    ],
  })
);
// serving static files.
app.use(express.static(`${__dirname}/public`));

// test middleware.
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//  ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`), 404);
});
app.use(globalErrorHandler);
module.exports = app;
