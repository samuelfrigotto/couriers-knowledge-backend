const db = require('../config/database');
const steamService = require('../services/steam.service');

// A função getMyProfile permanece a mesma
exports.getMyProfile = async (req, res) => {
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

// A função refreshEvaluatedPlayerNames permanece a mesma
exports.refreshEvaluatedPlayerNames = async (req, res) => {
    const authorId = req.user.id;
    try {
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

        const result = await steamService.updatePlayerNamesFromSteam(steamIdsToUpdate);
        
        res.status(200).json({ message: `Atualização concluída. ${result.updated} nomes foram atualizados.` });

    } catch (error) {
        console.error('Erro ao atualizar nomes de jogadores:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// FUNÇÃO DE ESTATÍSTICAS CORRIGIDA
exports.getUserStats = async (req, res) => {
    const authorId = req.user.id;
    const userSteamId = req.user.steam_id;

    try {
        const [evaluationsResult, userResult, matchHistory] = await Promise.all([
            db.query('SELECT rating, tags FROM evaluations WHERE author_id = $1', [authorId]),
            db.query('SELECT steam_username, avatar_url, created_at FROM users WHERE id = $1', [authorId]),
            steamService.getMatchHistory(userSteamId, 20)
        ]);

        const evaluations = evaluationsResult.rows;
        const user = userResult.rows[0];

        // --- Cálculos de Estatísticas Gerais (sem alteração) ---
        const totalEvaluations = evaluations.length;
        const averageRating = totalEvaluations > 0 ? parseFloat((evaluations.reduce((sum, e) => sum + parseFloat(e.rating), 0) / totalEvaluations).toFixed(2)) : 0;
        const tagCounts = (evaluations.flatMap(e => e.tags).filter(Boolean)).reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});
        const mostUsedTags = Object.entries(tagCounts).sort(([,a],[,b]) => b-a).slice(0, 5).map(([tag]) => tag);
        
        // --- Detalhes das partidas para cálculos complexos ---
        const matchDetailsPromises = matchHistory.map(match => steamService.getMatchDetails(match.match_id, authorId));
        const detailedMatches = (await Promise.all(matchDetailsPromises)).filter(Boolean);

        // --- CORREÇÃO: Todos os cálculos agora usam a fonte de dados rica 'detailedMatches' ---
        let winsLast20 = 0;
        let totalDuration = 0;
        const heroCounts = {};
        const opponentHeroCounts = {};
        let totalPossiblePlayers = 0;
        let evaluatedPlayers = 0;

        detailedMatches.forEach(match => {
            if (match && match.players) {
                totalDuration += match.duration;
                const userPlayerInfo = match.players.find(p => p.steam_id_64 === userSteamId);

                if (userPlayerInfo) {
                    if (userPlayerInfo.win === 1) {
                        winsLast20++;
                    }
                    heroCounts[userPlayerInfo.hero_id] = (heroCounts[userPlayerInfo.hero_id] || 0) + 1;
                }

                match.players.forEach(player => {
                    const isUser = player.steam_id_64 === userSteamId;
                    const isAnonymous = !player.steam_id_64;

                    if (!isUser) {
                        opponentHeroCounts[player.hero_id] = (opponentHeroCounts[player.hero_id] || 0) + 1;
                    }
                    if (!isUser && !isAnonymous) {
                        totalPossiblePlayers++;
                        if (player.is_already_evaluated) {
                            evaluatedPlayers++;
                        }
                    }
                });
            }
        });

        const averageMatchTime = detailedMatches.length > 0 ? Math.round(totalDuration / detailedMatches.length) : 0;
        const mostUsedHeroId = Object.entries(heroCounts).sort(([,a],[,b]) => b-a)[0]?.[0];
        const mostFacedHeroId = Object.entries(opponentHeroCounts).sort(([,a],[,b]) => b-a)[0]?.[0];
        const evaluationPercentage = totalPossiblePlayers > 0 ? Math.round((evaluatedPlayers / totalPossiblePlayers) * 100) : 0;

        const stats = {
            steamUsername: user.steam_username,
            avatarUrl: user.avatar_url,
            accountCreatedAt: user.created_at,
            accountStatus: 'Free',
            totalEvaluations,
            averageRating,
            mostUsedTags,
            winsLast20,
            mostUsedHeroId: mostUsedHeroId ? parseInt(mostUsedHeroId) : null,
            averageMatchTime,
            mostFacedHeroId: mostFacedHeroId ? parseInt(mostFacedHeroId) : null,
            evaluationPercentage
        };

        res.status(200).json(stats);

    } catch (error) {
        console.error('Erro ao buscar estatísticas do usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};