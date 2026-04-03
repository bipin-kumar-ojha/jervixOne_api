
import express from 'express';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import roleRoutes from './routes/role.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import cors from 'cors';
import helmet from 'helmet';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { globalRateLimiter } from './middlewares/globalRateLimit.middleware.js';
import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import { securityLogger } from "./middlewares/securityLogger.middleware.js";
import orgRoutes from "./routes/org.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import designationRoutes from "./routes/designation.routes.js";

import dotenv from "dotenv";
dotenv.config();

const app = express();
app.disable('x-powered-by');
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false, // usually handled by frontend
    crossOriginEmbedderPolicy: false
  })
);
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "Jervix");
  next();
});



const allowedOrigins = [
  'http://localhost:4200',        // Angular local
  'http://localhost:3000',        // React local
  'https://jervix.com',           // Website
  'https://www.jervix.com',    // Website with www
  'https://one.jervix.com'        // Jervix One App
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);
app.get('/', (req, res) => {
  res.send('🚀 Jervix One API is running');
});
app.get("/health", (req, res) => {
  res.status(200).json({
    brand: "Jervix",
    service: "Jervix Auth API",
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});
app.use(globalRateLimiter);


app.use(requestIdMiddleware);
app.use(express.json({ limit: '10kb' }));
app.use(securityLogger);



app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use("/api/v1/org", orgRoutes);
app.use("/api/v1/employees",employeeRoutes);
app.use("/api/v1/designations", designationRoutes);
app.use(errorMiddleware);

export default app;
