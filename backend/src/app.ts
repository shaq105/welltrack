import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import symptomRoutes from './routes/symptom.routes';
import symptomLogRoutes from './routes/symptomLog.routes';
import moodLogRoutes from './routes/moodLog.routes';
import medicationRoutes from './routes/medication.routes';
import medicationLogRoutes from './routes/medicationLog.routes';
import habitRoutes from './routes/habit.routes';
import habitLogRoutes from './routes/habitLog.routes';
import exportRoutes from './routes/export.routes';
import insightsRoutes from './routes/insights.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Trust reverse proxy (Render, Railway) so Express sees the real client IP and protocol
app.set('trust proxy', 1);

// Security headers including HSTS (enforces HTTPS in browsers)
app.use(
  helmet({
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// CORS — allow only the configured frontend origin
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/symptom-logs', symptomLogRoutes);
app.use('/api/mood-logs', moodLogRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/medication-logs', medicationLogRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/habit-logs', habitLogRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/insights', insightsRoutes);

app.use(errorHandler);

export default app;
