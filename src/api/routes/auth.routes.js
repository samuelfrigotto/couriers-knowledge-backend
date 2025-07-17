// backend/src/api/routes/auth.routes.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Rota 1: Inicia o processo de autenticação com a Steam
// Ao ser acessada, redireciona o usuário para a página de login da Steam
router.get('/auth/steam', passport.authenticate('steam', { session: true }));

// Rota 2: A Steam redireciona o usuário de volta para cá após o login
router.get('/auth/steam/return',
    passport.authenticate('steam', { session: true, failureRedirect: '/' }),
    (req, res) => {
        // Se a autenticação foi bem-sucedida, o `req.user` é populado pelo Passport
        const user = req.user;

        // Criamos nosso token JWT para o usuário
        const token = jwt.sign(
            { id: user.id, steam_id: user.steam_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Token expira em 7 dias
        );
        
        // Redirecionamos para o nosso frontend, passando o token como parâmetro
        // O frontend irá capturar este token e salvar para futuras requisições
        res.redirect(`${process.env.FRONTEND_URL}/login/success?token=${token}`);
    }
);

module.exports = router;
