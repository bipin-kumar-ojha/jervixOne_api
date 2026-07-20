
import express from 'express';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import roleRoutes from './routes/role.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { globalRateLimiter } from './middlewares/globalRateLimit.middleware.js';
import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import orgRoutes from "./routes/org.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import designationRoutes from "./routes/designation.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import teamRoutes from "./routes/team.routes.js";
import projectRoutes from "./routes/project.routes.js";
import projectAssignmentRoutes from "./routes/projectAssignment.routes.js";
import taskRoutes from "./routes/task.routes.js";
import websiteLeadRoutes from "./routes/websiteLead.routes.js";

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
  'http://localhost:5173',        // React Vite local
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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);
app.use(compression());
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



app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use("/api/v1/org", orgRoutes);
app.use("/api/v1/employees",employeeRoutes);
app.use("/api/v1/designations", designationRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/project-assignments", projectAssignmentRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/website-leads", websiteLeadRoutes);
app.use("/api/website-leads", websiteLeadRoutes);
app.use(errorMiddleware);

export default app;
