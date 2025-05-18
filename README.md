# Faction Bikeworks Website - Final Year Project

## Overview

This repository contains the source code for the Faction Bikeworks website, developed as a Final Year Project (FYP). The application features a customer-facing front-end for browsing products, managing carts, and placing orders, as well as an administrative interface for managing products, orders, banners, and brand images. It utilizes a separate front-end (React) and back-end (Node.js/Express) architecture.

## Prerequisites

Before running the project, ensure you have the following installed on your system:

* **Node.js**: Required for running both the front-end and back-end servers. The installation executable is included in the submission files. Alternatively, download and install the latest Long-Term Support (LTS) version from [https://nodejs.org/].
* **npm (Node Package Manager)**: Comes bundled with Node.js. It is highly recommended to update npm to the latest version to ensure compatibility and access to the latest features. Open your command prompt or terminal and run:

```npm install -g npm```


## Environment Configuration

* **Frontend**: Environment variables are managed in the `.env` file located at `src/factionbikeworks/.env`. This typically includes the URL for the backend API.
* **Backend**: Environment variables are managed in the `.env` file located at `src/backend/.env`. This includes database connection details, JWT secrets, email service credentials, and potentially other API keys.
* **Important**: These `.env` files contain necessary configurations and potentially sensitive information. They are correctly included in the submission for setup purposes but should **not** be committed to public version control systems like Git.
* All required environment configurations are present in the provided `.env` files; no manual changes should be needed for standard local setup.

## Database

* The back-end service connects to a pre-configured **online database**. The connection details are specified in the `src/backend/.env` file.
* **No local database installation or setup is required.**
* **Note for Local Development**: The online database connected during local development (`localhost`) is a designated **test server environment**. Any data modifications (creation, updates, deletion) performed while running the application locally are safe and **will not affect any production data**. Feel free to experiment.

## Installation and Setup

Follow these steps precisely to install dependencies for both the front-end and back-end. Execute commands from the **root directory** of the `FYP Code for Submission` folder unless otherwise specified.

**1. Install Back-end Dependencies:**

# Navigate to the backend directory
```cd src/backend```

# Install required npm packages
```npm install```

# Navigate back to the root project directory (optional, depends on your next step)
```cd ../..```


**2. Install Front-end Dependencies:**

# Navigate to the frontend directory (from the root)
```cd src/factionbikeworks```
# Or if you are already in src/backend, use: cd ../factionbikeworks

# Install required npm packages
```npm install```

# Navigate back to the root project directory (optional)
```cd ../..```


## Running the Application

The front-end and back-end servers must run concurrently. Open **two separate** terminal windows or tabs.

**1. Start the Back-end Server:**

* In the first terminal:
    # Navigate to the backend directory
    ```cd src/backend```

    # Start the server in development mode (with nodemon for auto-restarts)
    ```npm run dev```

* The back-end server will start, typically listening on the port defined in its `.env` file. Watch the terminal output for confirmation messages like "Server running on port XXXX" and database connection success.

**2. Start the Front-end Development Server:**

* In the second terminal:
    # Navigate to the frontend directory
    ```cd src/factionbikeworks```

    # Start the React development server
    ```npm start```

* This command compiles the React application and usually opens it automatically in your default web browser at `http://localhost:3000`. If it doesn't open automatically, navigate to that URL manually. The front-end application will interact with the back-end server running on its specified port.

## Running Unit Tests (Back-end)

The back-end includes a suite of unit tests using Jest to verify the functionality of individual API endpoints.

1.  Ensure the back-end server is **not** running in the terminal you intend to use for testing (or use a third terminal).
2.  Navigate to the back-end directory:
 
    ```cd src/backend```

3.  Run the test suite:

    ```npm test```

    * Vitest will execute all files matching the `*.test.js` pattern within the `src/backend/api-endpoints/tests` directory. Test results (pass/fail summaries) will be displayed directly in the terminal.
4.  Generate a Formatted Test Report:

    ```node generateTestReport.js```

    * This custom script uses the `unit-test-results.json` file (automatically generated by the `npm test` script configured in `package.json`) to create a more readable `unit-test-report.pdf` file within the `src/backend` directory.

## Admin Credentials

To access the administrative dashboard and management sections of the website when running locally:

* **Username:** `Admin`
* **Password:** `admin`

Navigate to the application's login page (`/login`) and use these credentials and the admin page button will be unlocked in the header.

## Project Structure

```
Faction/
├── src/
│   ├── backend/              # Node.js/Express backend application
│   │   ├── api-endpoints/    # API route handlers and business logic
│   │   │   ├── accounts/     # Account management (login, signup, reset pwd, auth)
│   │   │   ├── banners/      # Banner management (add, get, delete)
│   │   │   ├── cart/         # Cart, order, checkout (add, get, remove, create order, etc.)
│   │   │   ├── products/     # Product and brand management (add, get, update, delete)
│   │   │   └── tests/        # Unit tests for API endpoints (Jest)
│   │   │       ├── accounts/
│   │   │       ├── banners/
│   │   │       ├── cart/
│   │   │       └── products/
│   │   ├── config/           # Configuration files (e.g., nodemailer.js)
│   │   ├── database/         # Database interaction layer (Sequelize)
│   │   │   ├── models/       # Sequelize model definitions (account, product, order, etc.)
│   │   │   ├── index.js      # Sequelize initialization and model associations
│   │   │   ├── startup.js    # Initial database setup/sync logic (if any)
│   │   │   └── utils.js      # Database utility functions
│   │   ├── file-uploads/     # File upload handling (Multer config, specific upload logic)
│   │   ├── routes/           # Express route definitions (routes.js)
│   │   ├── .env              # Backend environment variables (DB conn, JWT, email keys)
│   │   ├── generateTestReport.js # Script to create PDF test report from JSON
│   │   ├── server.js         # Main backend server entry point (Express app setup)
│   │   ├── utils.js          # General backend utility functions
│   │   ├── package.json      # Backend dependencies (express, sequelize, jest, etc.) and scripts
│   │   ├── package-lock.json # Lockfile for precise dependency versions
│   │   ├── unit-test-report.pdf # Generated PDF test report
│   │   └── unit-test-results.json # Raw JSON output from Jest tests
│   │
│   └── factionbikeworks/     # React frontend application
│       ├── build/            # Production build output (generated via 'npm run build')
│       ├── public/           # Static assets (favicon, images, manifest.json, index.html template)
│       ├── src/              # Frontend source code
│       │   ├── components/   # Reusable UI components (Header, Footer, Carousel, Admin UI parts, etc.)
│       │   │   └── Admin/    # Components specific to the Admin interface
│       │   ├── pages/        # Page-level components (Home, Catalog, Cart, Login, Admin pages, etc.)
│       │   │   └── Admin/    # Admin-specific page components
│       │   ├── routes/       # React Router setup (AppRoutes.js, Navigation.js)
│       │   ├── .env          # Frontend environment variables (e.g., REACT_APP_API_URL)
│       │   ├── App.css       # Global application styles
│       │   ├── App.js        # Main application component, router setup
│       │   ├── AxiosSingleton.js # Axios instance configuration
│       │   ├── CookieManager.js # Utility for handling cookies (likely for auth tokens)
│       │   ├── index.js      # Frontend entry point (renders App component)
│       │   ├── utils.js      # General frontend utility functions
│       │   ├── package.json  # Frontend dependencies (react, react-router, axios, etc.) and scripts
│       │   └── package-lock.json # Lockfile for precise dependency versions
│
├── README.md                 # This file
├── package.json              # Root level package.json (if used for managing both workspaces)
└── package-lock.json         # Root level lockfile (if applicable)
```
