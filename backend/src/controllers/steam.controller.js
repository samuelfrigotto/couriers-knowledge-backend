const steamService = require('../services/steam.service');
const db = require('../config/database');

exports.getMatchHistory = async (req, res) => {
    const userSteamId = req.user.steam_id;
    const authorId = req.user.id; // Precisamos do ID interno para a verificação

    try {
        // 1. Pega o histórico básico de partidas (ainda útil para obter os IDs)
        const basicHistory = await steamService.getMatchHistory(userSteamId, 20); // Limite de 20 partidas

        if (!basicHistory || basicHistory.length === 0) {
            return res.status(200).json([]);
        }

        // 2. Para cada partida, busca os detalhes completos em paralelo
        const matchDetailsPromises = basicHistory.map(match =>
            steamService.getMatchDetails(match.match_id, authorId)
        );

        const detailedMatches = await Promise.all(matchDetailsPromises);

        // 3. Formata a resposta final com os dados que o frontend precisa
        const finalResponse = basicHistory.map((match, index) => {
            const details = detailedMatches[index];
            const userPlayerInfo = details.find(p => p.steam_id_64 === userSteamId);
            
            // Pega o score de cada time a partir dos dados dos jogadores
            const radiantScore = details.filter(p => p.is_radiant).reduce((sum, p) => sum + (p.kills || 0), 0);
            const direScore = details.filter(p => !p.is_radiant).reduce((sum, p) => sum + (p.kills || 0), 0);

            return {
                match_id: match.match_id,
                start_time: match.start_time,
                duration: match.duration,
                radiant_win: match.radiant_win,
                user_hero_id: userPlayerInfo ? userPlayerInfo.hero_id : match.hero_id,
                players: details.map(p => ({
                    hero_id: p.hero_id,
                    is_radiant: p.is_radiant
                })),
                radiant_score: radiantScore,
                dire_score: direScore
            };
        }).filter(match => match.players.length > 0);

        res.status(200).json(finalResponse);

    } catch (error) {
        console.error('Erro ao buscar histórico de partidas detalhado:', error);
        res.status(500).json({ message: 'Erro ao buscar histórico de partidas.', error: error.message });
    }
};


exports.getMatchDetails = async (req, res) => {
    const matchId = req.params.matchId;
    const authorId = req.user.id; // ID do nosso banco
    try {
        const details = await steamService.getMatchDetails(matchId, authorId);
        res.status(200).json(details);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar detalhes da partida.', error: error.message });
    }
};