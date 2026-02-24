const User = require('../models/user');

async function requireAuth(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.redirect('/');
    }
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/');
    }
    res.locals.user = user;
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
