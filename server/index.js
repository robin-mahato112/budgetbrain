import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.get('/', (req, res) => res.json({ message: 'NovaMind API running 🚀' }));
app.listen(process.env.PORT || 5000, () => console.log('🚀 Server running on port 5000'));