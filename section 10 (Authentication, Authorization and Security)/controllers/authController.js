const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const { Promisify } = require('util');
const sendEmail = require('../utils/email');
const crypto = require('crypto');
const { promisify } = require('util');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // this makes the browser get the cookie and send it back but wont be able to access.
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // remove password from output.
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // pass only the data is required to create a new user.
  const { name, email, password, passwordConfirm } = req.body;
  const newUser = await User.create({ name, email, password, passwordConfirm });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1- check if the email and password exists.
  if (!email || !password) {
    return next(new AppError('please provide a valid email and password'), 400);
  }

  // 2- check if user exists and password is correct.

  // حطينا + عشان احنا عاملينها اصلا فولس ف ال+ هنا هتخليها ترو ويجيب القيمة بتاعة الباسورد ف اليوزر
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Email or password is incorrect', 401));
  }

  // 3- if everything is ok send token to client

  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1- get token and check if it is there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(
      new AppError('you are not logged in. Please login to get access', 401)
    );
  }

  // 2- verify token

  const decoded = promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3- check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError('This user is no longer exists', 401));
  }

  // 4- check if user has changed password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. please log in again', 401)
    );
  }

  req.user = currentUser;
  // access to protected route
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      next(
        new AppError("You don't have permission to perform this action", 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1- check user based on POSTed email.
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new AppError('There is no user with this email, please try again.', 404)
    );
  }

  // 2- generate random reset token.
  const resetToken = user.createdPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3- send it to user email.

  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot Password? check this link to reset your password: ${resetURL}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your reset token is valid for 10 minutes',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.resetTokenExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending this email. Try again later!',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1- get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    resetTokenExpiresIn: { $gt: Date.now() },
  });

  if (!user)
    return next(new AppError('This token is invalid or has expired'), 400);

  // 2- set new password if there is user and token has not expired.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.resetTokenExpiresIn = undefined;
  await user.save();

  // 3-update changedPasswordAt property

  // 4- log the user in, send jwt.
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1- get user from collection.
  const user = await User.findById(req.user.id).select('+password');
  // 2- check if posted password is correct.

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return new AppError('This password is incorrect. Please try again', 401);
  }
  // 3- if true update password.
  user.passwordConfirm = req.body.passwordConfirm;
  user.password = req.body.password;
  await user.save();
  //User.findByIdAndUpdate won't work here and validation wont work with it

  // 4- send jwt, log user in.
  createSendToken(user, 200, res);
});
