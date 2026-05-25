import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT,
  frontendUrl: process.env.FRONTEND_URL,
  databaseUrl: process.env.DATABASE_URL,
  paymentGatewayUrl: process.env.PAYMENT_GATEWAY_URL,
  jwtSecret: process.env.JWT_SECRET,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY,
  xaiApiKey: process.env.XAI_API_KEY,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY,
  openRouterApiKey: process.env.OPEN_ROUTER_API_KEY,
  falAiApiKey: process.env.FAL_KEY,
  kavenegar: {
    apiKey: process.env.KAVENEGAR_API_KEY,
    sender: process.env.KAVENEGAR_SENDER,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10),
  },
  s3: {
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucketName: process.env.S3_BUCKET_NAME,
  },
  systemInstruction: "User is reading your responses in a mobile screen. Avoid long answers as they won’t be able to read it properly.Always answer in the same language as the user's writing. e.g if the user is writing in Persian, you should answer in Persian."
};
