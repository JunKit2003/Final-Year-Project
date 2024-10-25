export default async function authenticate(req, res) {
    try {
        
        // console.log("In Authenticate");
        // console.log(req.session);

        if (!req.session.user) {
            return res.status(401).send({ message: 'User not logged in' }); // 401 Unauthorized
        }

        const { category } = req.session.user;
        const roles = {
            admin: 'Admin user logged in',
            customer: 'Customer user logged in',
        };

        if (roles[category]) {
            return res.status(200).send({ message: roles[category], user: req.session.user });
        } else {
            return res.status(403).send({ message: 'Access denied: User role not recognized' }); // 403 Forbidden
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
}
