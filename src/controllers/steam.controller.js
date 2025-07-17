const steamService = require('../services/steam.service');

exports.getMatchHistory = async (req, res) => {
    const userSteamId = req.user.steam_id;
    const authorId = req.user.id;

    try {
        const basicHistory = await steamService.getMatchHistory(userSteamId, 20);

        if (!basicHistory || basicHistory.length === 0) {
            return res.status(200).json([]);
        }

        const matchDetailsPromises = basicHistory.map(match =>
            steamService.getMatchDetails(match.match_id, authorId)
        );
        
        const detailedMatches = await Promise.all(matchDetailsPromises);

        const finalResponse = detailedMatches.map((details) => {
            if (!details) return null;

            const userPlayerInfo = details.players.find(p => p.steam_id_64 === userSteamId);
            const userWon = userPlayerInfo ? userPlayerInfo.win === 1 : false;

            return {
                match_id: details.match_id,
                start_time: details.start_time,
                duration: details.duration,
                user_won: userWon,
                user_hero_id: userPlayerInfo ? userPlayerInfo.hero_id : 0,
                player_slot: userPlayerInfo ? userPlayerInfo.player_slot : 0,
                players: details.players.map(p => ({
                    hero_id: p.hero_id,
                    is_radiant: p.is_radiant
                })),
                radiant_score: details.radiant_score,
                dire_score: details.dire_score
            };
        }).filter(match => match !== null);

        res.status(200).json(finalResponse);

    } catch (error) {
        console.error('Erro ao buscar histórico de partidas detalhado:', error);
        res.status(500).json({ message: 'Erro ao buscar histórico de partidas.', error: error.message });
    }
};

exports.getMatchDetails = async (req, res) => {
    const matchId = req.params.matchId;
    const authorId = req.user.id;
    try {
        const details = await steamService.getMatchDetails(matchId, authorId);
        // Agora retornamos o objeto de detalhes completo, que contém os jogadores e o placar
        res.status(200).json(details);
    } catch (error) {
        console.error('Erro ao buscar detalhes da partida.', error);
        res.status(500).json({ message: 'Erro ao buscar detalhes da partida.', error: error.message });
    }
};