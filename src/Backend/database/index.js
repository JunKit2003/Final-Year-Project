// Main index file to connect to the database and initialise it using sequalize

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { Sequelize } from 'sequelize';

// dotenv congifuration
import dotenv from 'dotenv';
dotenv.config();


import { initializeDatabase } from './startup.js';

// Initialize Sequelize with additional options
const sequelize = new Sequelize(process.env.DATABASE, process.env.DATABASE_USERNAME, process.env.DATABASE_PASSWORD, {
  host: process.env.HOST_DATABASE,
  dialect: 'mysql',
  logging: false, // Toggle to true for SQL logs
  dialectOptions: {
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true,
  },
  timezone: '+08:00', // Match timezone to SQL dump
});

const db = {};

// Deriving __dirname in an ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadModels(modelsPath) {

  try {
    const modelFiles = readdirSync(modelsPath)
      .filter(file => file.indexOf('.') !== 0 && file.slice(-3) === '.js');

    for (const file of modelFiles) {
      const modelPath = join(modelsPath, file);
      const modelURL = pathToFileURL(modelPath).href; // Convert path to URL
      const { default: modelDefiner } = await import(modelURL);
      const model = modelDefiner(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    }

    Object.keys(db).forEach(modelName => {
      if (db[modelName].associate) {
        db[modelName].associate(db);
      }
    });

    console.log("Database models loaded!");
  } catch (error) {
    console.error("Error loading database models: ", error);
  }

}

// Load models and set associations
await loadModels(join(__dirname, 'models'));

console.log("Connected to the Database!");

await sequelize.sync({ force: false });

// Check if account table is empty
const accountCount = await db.Account.count();

// Check if products table is empty
const productCount = await db.Products.count();

// Check if banner_image table is empty
const banner_imageCount = await db.BannerImage.count();


// If any of the tables are empty, initialize the database
if (accountCount === 0 || productCount === 0 || banner_imageCount === 0) {
  console.log("Database not initialized properly, initializing now....");
  await initializeDatabase();
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export { db };