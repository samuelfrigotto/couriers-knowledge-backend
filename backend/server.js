// server.js

// 1. Importar as dependências
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const cors = require('cors');
const session = require('express-session'); // <-- Adicionar
const passport = require('passport');       // <-- Adicionar

// 2. Inicializar o aplicativo Express
const app = express();
const healthRoutes = require('./src/api/routes/health.routes'); 
const authRoutes = require('./src/api/routes/auth.routes'); // <-- Adicionar
const userRoutes = require('./src/api/routes/user.routes');
const evaluationRoutes = require('./src/api/routes/evaluation.routes');
const steamRoutes = require('./src/api/routes/steam.routes'); // <-- Adicionar

// 3. Configurar os Middlewares
app.use(cors()); // Permite requisições de outras origens (nosso frontend)
app.use(express.json()); // Permite que o Express entenda requisições com corpo em JSON

// --- CONFIGURAÇÃO DA SESSÃO E PASSPORT ---  <-- Adicionar esta seção
app.use(session({
    secret: process.env.JWT_SECRET, // Usamos o mesmo segredo por conveniência
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());
require('./src/config/passport'); // Importante: Carrega nossa configuração do passport
// --- FIM DA CONFIGURAÇÃO ---


// configuração de rotas
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', evaluationRoutes);
app.use('/api', steamRoutes);

// 4. Definir a porta a partir do ambiente ou usar um valor padrão
const PORT = process.env.PORT || 3000;

// 5. Criar uma rota de teste para verificar se o servidor está no ar
app.get('/', (req, res) => {
  res.json({ message: 'Bem-vindo à API da Dotabase! O servidor está funcionando.' });
});

// Futuramente, aqui virão nossas rotas principais
// Ex: const authRoutes = require('./src/api/routes/auth.routes');
// app.use('/api/auth', authRoutes);

// 6. Iniciar o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Dotabase rodando na porta ${PORT}`);
});