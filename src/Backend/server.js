import express from 'express';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import appRoutes from './routes/routes.js';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import SequelizeStoreInit from 'connect-session-sequelize';

dotenv.config({ quiet: true });

const app = express();

// A guessable secret lets anyone forge session cookies (and so sign in as admin).
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('SESSION_SECRET is not set. Refusing to start in production.');
    process.exit(1);
  }
  console.warn('SESSION_SECRET is not set; using an insecure development secret.');
}

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.DATABASE_USERNAME,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.HOST_DATABASE,
    port: Number(process.env.DATABASE_PORT) || 3306,
    dialect: 'mysql',
  }
);

const SequelizeStore = SequelizeStoreInit(session.Store);

// Middleware
app.use(cookieParser());
app.use(express.json());
// Express 5's body parser leaves req.body undefined when no JSON body was sent
// (Express 4 always set {}). Handlers destructure req.body, so keep the old default.
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

// Behind host Nginx in production: trust X-Forwarded-* so req.secure and
// the Secure session cookie work over HTTPS.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// CORS_ORIGINS="https://a.com,https://b.com" limits credentialed cross-origin calls to
// those sites. Unset keeps the old behaviour (reflect any origin). Same-origin setups
// (the containers) need no CORS at all.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      callback(null, true);
    } else if (allowedOrigins.length) {
      callback(null, allowedOrigins.includes(origin) ? origin : false);
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
  secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  store: new SequelizeStore({
    db: sequelize,
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    // COOKIE_SECURE=true behind HTTPS (needs TRUST_PROXY when TLS ends at nginx).
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

// Sync session table to the database
const sessionStore = new SequelizeStore({ db: sequelize });
sessionStore.sync();

// Liveness for container health checks: no DB query, cheap enough to poll.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', appRoutes);
app.use('/images', express.static('images', { maxAge: '7d' }));

if (process.env.SERVE_STOREFRONT === 'true') {
  const storefront = fileURLToPath(new URL('./storefront/', import.meta.url));
  app.use('/assets', express.static(fileURLToPath(new URL('./storefront/assets/', import.meta.url)), {
    maxAge: '1y',
    immutable: true,
  }));
  const shellCache = { 'Cache-Control': 'no-cache' };
  app.use(express.static(storefront, {
    setHeaders: (res) => res.set(shellCache),
  }));
  app.get(/^\/(?!api(?:\/|$)|images(?:\/|$)|assets(?:\/|$)).*$/, (req, res) => {
    res.sendFile('index.html', { root: storefront, headers: shellCache, cacheControl: false });
  });
}

const PORT = process.env.PORT_SERVER || 8000;
app.listen(PORT, (error) => {
  // Express 5 passes listen errors (e.g. EADDRINUSE) here instead of crashing.
  if (error) throw error;
  console.log(`Server started on ${process.env.HOST}:${PORT}`);
});
