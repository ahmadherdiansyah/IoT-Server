// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isDev = req.app.get('env') === 'development';

  if (req.path.startsWith('/api')) {
    return res.status(status).json({
      error: err.message,
      ...(isDev && { stack: err.stack }),
    });
  }

  res.locals.message = err.message;
  res.locals.error = isDev ? err : {};
  res.status(status);
  res.render('error');
}

module.exports = errorHandler;
