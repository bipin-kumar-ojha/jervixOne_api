export const securityLogger = (req, res, next) => {
  const log = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    userId: req.user ? req.user._id : null,
    time: new Date().toISOString(),
  };


  next();
};