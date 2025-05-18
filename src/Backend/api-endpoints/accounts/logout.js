// src/routes/logout.js
export default async function logout(req, res) {
    try {
        // Check if user is logged in
        if (req.session.user) {
            // Destroy the session to log the user out
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error during logout:", err);
                    return res.status(500).json({ message: "Internal server error" });
                }

                // Send success response
                res.status(200).json({ message: "Logout successful!" });
            });
        } else {
            return res.status(401).json({ message: "No user logged in" }); // 401 Unauthorized
        }
    } catch (error) {
        console.error("Error during logout:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
}
