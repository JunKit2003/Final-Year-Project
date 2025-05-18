import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import appRoutes from './routes/routes.js';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import SequelizeStoreInit from 'connect-session-sequelize';

dotenv.config();

const app = express();

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.DATABASE_USERNAME,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.HOST_DATABASE,
    dialect: 'mysql',
  }
);

const SequelizeStore = SequelizeStoreInit(session.Store);

// Middleware
app.use(cookieParser());
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

// Configure session to store in MySQL with Sequelize
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  store: new SequelizeStore({
    db: sequelize,
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

// Sync session table to the database
const sessionStore = new SequelizeStore({ db: sequelize });
sessionStore.sync();

app.use('/api', appRoutes);
app.use('/images', express.static('images'));

const PORT = process.env.PORT_SERVER || 8000;
app.listen(PORT, () => {
  console.log(`Server started on ${process.env.HOST}:${PORT}`);
});
