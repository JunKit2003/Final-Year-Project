import express from 'express';
import cors from 'cors';
import session from 'express-session';

import appRoutes  from './routes/routes.js';

import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(express.json());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
        callback(null, true);
    } else {
        callback(null, origin);
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use('/api', appRoutes);
app.use('/images', express.static('images'));

const PORT = process.env.PORT_SERVER || 8000;
app.listen(PORT, () => {
  console.log(`Server started on ${process.env.HOST}:${PORT}`);
});
