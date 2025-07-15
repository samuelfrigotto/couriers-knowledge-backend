const steamService = require('../services/steam.service');

exports.getMatchHistory = async (req, res) => {
    const userSteamId = req.user.steam_id;
    const authorId = req.user.id;

    try {
        const basicHistory = await steamService.getMatchHistory(userSteamId, 20);

        if (!basicHistory || basicHistory.length === 0) {
            return res.status(200).json([]);
        }

        // A chamada ao serviço continua a mesma
        const matchDetailsPromises = basicHistory.map(match =>
            steamService.getMatchDetails(match.match_id, authorId)
        );
        
        const detailedMatches = await Promise.all(matchDetailsPromises);

        const finalResponse = detailedMatches.map((details, index) => {
            // A variável 'details' agora é o objeto de partida completo da OpenDota
            if (!details || !details.players || details.players.length === 0) {
                return null;
            }

            const matchInfo = basicHistory[index];
            const userPlayerInfo = details.players.find(p => convertAccountIdToSteamId64(p.account_id) === userSteamId);
            
            // CORREÇÃO: Usando o placar diretamente da resposta da API
            const radiantScore = details.radiant_score || 0;
            const direScore = details.dire_score || 0;
            
            const userWon = userPlayerInfo ? userPlayerInfo.win === 1 : false;

            return {
                match_id: matchInfo.match_id,
                start_time: matchInfo.start_time,
                duration: matchInfo.duration,
                user_won: userWon,
                user_hero_id: userPlayerInfo ? userPlayerInfo.hero_id : matchInfo.hero_id,
                player_slot: userPlayerInfo ? userPlayerInfo.player_slot : matchInfo.player_slot,
                players: details.players.map(p => ({
                    hero_id: p.hero_id,
                    is_radiant: p.isRadiant
                })),
                radiant_score: radiantScore,
                dire_score: direScore
            };
        }).filter(match => match !== null);

        res.status(200).json(finalResponse);

    } catch (error) {
        console.error('Erro ao buscar histórico de partidas detalhado:', error);
        res.status(500).json({ message: 'Erro ao buscar histórico de partidas.', error: error.message });
    }
};

// A função convertAccountIdToSteamId64 agora só é necessária aqui, se não for usada em outro lugar
function convertAccountIdToSteamId64(accountId) {
    if (!accountId || typeof accountId !== 'number' || accountId <= 0 || accountId === 4294967295) {
        return null;
    }
    return (BigInt(76561197960265728) + BigInt(accountId)).toString();
}

exports.getMatchDetails = async (req, res) => {
    const matchId = req.params.matchId;
    const authorId = req.user.id;
    try {
        const details = await steamService.getMatchDetails(matchId, authorId);
        res.status(200).json(details.players); // Retorna apenas a lista de jogadores, como antes
    } catch (error) {
        console.error('Erro ao buscar detalhes da partida.', error);
        res.status(500).json({ message: 'Erro ao buscar detalhes da partida.', error: error.message });
    }
};