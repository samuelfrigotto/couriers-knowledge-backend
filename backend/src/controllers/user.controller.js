// backend/src/controllers/user.controller.js
const db = require('../config/database');
const steamService = require('../services/steam.service');


// Retorna o perfil do usuário atualmente logado
exports.getMyProfile = async (req, res) => {
    // Graças ao nosso middleware, temos o `req.user` com os dados do token
    const userId = req.user.id;

    try {
        const { rows } = await db.query('SELECT id, steam_id, steam_username, avatar_url, created_at FROM users WHERE id = $1', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

exports.refreshEvaluatedPlayerNames = async (req, res) => {
    const authorId = req.user.id;
    try {
        // 1. Busca todos os SteamIDs distintos que este usuário já avaliou
        const query = `
            SELECT DISTINCT p.steam_id FROM players p
            JOIN evaluations e ON p.id = e.player_id
            WHERE e.author_id = $1;
        `;
        const { rows } = await db.query(query, [authorId]);
        const steamIdsToUpdate = rows.map(r => r.steam_id);

        if (steamIdsToUpdate.length === 0) {
            return res.status(200).json({ message: 'Nenhum jogador para atualizar.', updated: 0 });
        }

        // 2. Chama nosso novo serviço para fazer o trabalho pesado
        const result = await steamService.updatePlayerNamesFromSteam(steamIdsToUpdate);

        res.status(200).json({ message: `Atualização concluída. ${result.updated} nomes foram atualizados.` });

    } catch (error) {
        console.error('Erro ao atualizar nomes de jogadores:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.getUserStats = async (req, res) => {
    const authorId = req.user.id;
    const userSteamId = req.user.steam_id;

    try {
        // 1. Busca de dados do nosso banco
        const evaluationsQuery = db.query('SELECT rating, tags FROM evaluations WHERE author_id = $1', [authorId]);
        const userQuery = db.query('SELECT steam_username, avatar_url, created_at FROM users WHERE id = $1', [authorId]);

        // 2. Busca de dados da API da OpenDota
        const matchHistoryQuery = steamService.getMatchHistory(userSteamId, 20); // Pega as últimas 20 partidas

        // Executa todas as buscas em paralelo para otimizar o tempo
        const [evaluationsResult, userResult, matchHistory] = await Promise.all([evaluationsQuery, userQuery, matchHistoryQuery]);

        const evaluations = evaluationsResult.rows;
        const user = userResult.rows[0];

        // 3. Calcula as estatísticas
        let totalEvaluations = evaluations.length;
        let averageRating = 0;
        if (totalEvaluations > 0) {
            const sumOfRatings = evaluations.reduce((sum, e) => sum + e.rating, 0);
            averageRating = parseFloat((sumOfRatings / totalEvaluations).toFixed(2));
        }

        const tagCounts = evaluations.flatMap(e => e.tags || []).reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});
        const mostUsedTags = Object.entries(tagCounts).sort(([,a],[,b]) => b-a).slice(0, 5).map(([tag]) => tag);

        const winsLast20 = matchHistory.filter(m => (m.player_slot < 128 && m.radiant_win) || (m.player_slot >= 128 && !m.radiant_win)).length;

        const heroCounts = matchHistory.reduce((acc, match) => {
            acc[match.hero_id] = (acc[match.hero_id] || 0) + 1;
            return acc;
        }, {});
        const mostUsedHeroId = Object.entries(heroCounts).sort(([,a],[,b]) => b-a)[0]?.[0];

        // 4. Monta o objeto de resposta final
        const stats = {
            steamUsername: user.steam_username,
            avatarUrl: user.avatar_url,
            accountCreatedAt: user.created_at,
            accountStatus: 'Free', // Futuramente, podemos mudar isso
            totalEvaluations,
            averageRating,
            mostUsedTags,
            winsLast20,
            mostUsedHeroId: mostUsedHeroId ? parseInt(mostUsedHeroId) : null
        };

        res.status(200).json(stats);

    } catch (error) {
        console.error('Erro ao buscar estatísticas do usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

