const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'please enter a name'],
    trim: true,
    minLength: [10, 'Name must be at least 10 characters'],
    maxLength: [40, 'Name must be at most 10 characters'],
  },
  email: {
    type: String,
    required: [true, 'please enter an email address'],
    trim: true,
    unique: true,
    validate: [validator.isEmail, 'please enter a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  photo: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'guide', 'lead-guide'],
    default: 'user',
  },
  passwordConfirm: {
    type: String,
    required: [true, 'please confirm your password'],
    select: false,
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'passwords do not match!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  resetTokenExpiresIn: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// بتشفر الباسورد قبل ما يتبعت وقبل حفظ النسخة النهائية للداتا
userSchema.pre('save', async function (next) {
  // runs only if password is already modified
  if (!this.isModified('password')) return next();

  // hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // delete the password confirmation
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 2000;
  next();
});
// before find an findById and all starting with find methods`
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createdPasswordResetToken = function () {
  // 1- create the token which we wanna send
  const resetToken = crypto.randomBytes(32).toString('hex');
  // 2- hashing it because we don't want any one else to change the password except for the user
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  // make it expires in 10 minutes.
  this.resetTokenExpiresIn = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
const User = mongoose.model('User', userSchema);

module.exports = User;
