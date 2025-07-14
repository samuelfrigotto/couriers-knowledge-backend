// backend/src/config/passport.js
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const db = require('./database'); // Nosso módulo de conexão com o DB

passport.use(new SteamStrategy({
    returnURL: `${process.env.API_URL}/auth/steam/return`,
    realm: process.env.APP_URL,
    apiKey: process.env.STEAM_API_KEY
  },
  async (identifier, profile, done) => {
    // Esta função é chamada após a autenticação bem-sucedida da Steam
    try {
        const steamId = profile.id;

        // 1. Tenta encontrar o usuário no nosso banco de dados
        const { rows } = await db.query('SELECT * FROM users WHERE steam_id = $1', [steamId]);

        if (rows.length > 0) {
            // 2a. Se o usuário existe, retorna o usuário encontrado
            const user = rows[0];
            return done(null, user);
        } else {
            // 2b. Se o usuário não existe, cria um novo no nosso banco
            const newUser = {
                steam_id: steamId,
                steam_username: profile.displayName,
                avatar_url: profile.photos[2].value, // Pega o avatar maior
            };

            const insertQuery = `
                INSERT INTO users(steam_id, steam_username, avatar_url) 
                VALUES($1, $2, $3) 
                RETURNING *
            `;
            const values = [newUser.steam_id, newUser.steam_username, newUser.avatar_url];
            const { rows: newRows } = await db.query(insertQuery, values);

            return done(null, newRows[0]);
        }
    } catch (error) {
        return done(error, null);
    }
  }
));

// Estas funções são necessárias para o Passport gerenciar a sessão
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, rows[0]);
    } catch (error) {
        done(error, null);
    }
});