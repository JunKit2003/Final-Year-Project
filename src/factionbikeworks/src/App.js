// src/App.js

import "./App.css";
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes"; // Import the routing configuration

function App() {
	return (
		<Router>
			<AppRoutes />{" "}
			{/* All routes are handled in the separate AppRoutes.js */}
		</Router>
	);
}

export default App;
