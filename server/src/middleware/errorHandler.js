export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.type === 'entity.too.large'
    ? 'حجم فایل یا درخواست بیش از حد مجاز است'
    : err.message || 'خطای سرور';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

