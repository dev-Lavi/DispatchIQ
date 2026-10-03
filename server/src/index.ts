import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './api/routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Field Service Dispatch & Replanning Agent API',
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[DispatchIQ Server] running on http://localhost:${PORT}`);
  });
}

export default app;
