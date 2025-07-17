// backend/src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    // Pega o token do header 'Authorization' que vem no formato "Bearer <token>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        // Se não há token, retorna 401 Unauthorized (Não Autorizado)
        return res.status(401).json({ message: 'No token provided.' });
    }

    // Verifica se o token é válido
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // Se o token for inválido (expirado, etc), retorna 403 Forbidden (Proibido)
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        
        // Se o token é válido, salvamos o payload decodificado na requisição
        // para que as próximas rotas possam usar as informações do usuário (como o ID)
        req.user = decoded;
        next(); // Passa para a próxima função (o controller da rota)
    });
};