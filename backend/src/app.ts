import express from 'express';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import symptomRoutes from './routes/symptom.routes';
import symptomLogRoutes from './routes/symptomLog.routes';
import moodLogRoutes from './routes/moodLog.routes';
import medicationRoutes from './routes/medication.routes';
import medicationLogRoutes from './routes/medicationLog.routes';
import habitRoutes from './routes/habit.routes';
import habitLogRoutes from './routes/habitLog.routes';

const app = express();

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

export default app;
