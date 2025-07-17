// server.js

// 1. Importar as dependências
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');

// Importa as rotas
const healthRoutes = require('./src/api/routes/health.routes');
const authRoutes = require('./src/api/routes/auth.routes');
const userRoutes = require('./src/api/routes/user.routes');
const evaluationRoutes = require('./src/api/routes/evaluation.routes');
const steamRoutes = require('./src/api/routes/steam.routes');
const gsiRoutes = require('./src/api/routes/gsi.routes');

// 2. Inicializar o aplicativo Express
const app = express();

// 3. Configurar os Middlewares
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DA SESSÃO E PASSPORT ---
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());
require('./src/config/passport');
// --- FIM DA CONFIGURAÇÃO ---


// 4. Definir a porta a partir do ambiente ou usar um valor padrão
const PORT = process.env.PORT || 3001;

// 5. Rota de teste
app.get('/', (req, res) => {
  // ATUALIZAÇÃO DO NOME AQUI
  res.json({ message: "Bem-vindo à API do Courier's Knowledge! O servidor está funcionando." });
});

// Carrega as rotas da API
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', evaluationRoutes);
app.use('/api', steamRoutes);
app.use('/api', gsiRoutes);

// 6. Iniciar o servidor
app.listen(PORT, () => {
  // ATUALIZAÇÃO DO NOME AQUI
  console.log(`🚀 Servidor Courier's Knowledge rodando na porta ${PORT}`);
});