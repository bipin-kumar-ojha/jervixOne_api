export const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error({
    brand: "Jervix",
    service: "Jervix Auth API",
    requestId: req.id,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date()
  });

  res.status(statusCode).json({
    success: false,
    brand: "Jervix",
    service: "Jervix Auth API",
    requestId: req.id,
    message: err.message
  });
};