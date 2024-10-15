export default async function authenticate(req, res) {
    try {
        // Check if the user session exists
        if (req.session.user) {
            // Check user role
            if (req.session.user.category === 'admin') {
                return res.status(200).send({ message: 'Admin user logged in', user: req.session.user });
            } else if (req.session.user.category === 'customer') {
                return res.status(200).send({ message: 'Customer user logged in', user: req.session.user });
            } else {
                return res.status(403).send({ message: 'Access denied: User role not recognized' }); // 403 Forbidden
            }
        } else {
            return res.status(401).send({ message: 'User not logged in' }); // 401 Unauthorized
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ message: 'Internal server error', error });
    }
}
