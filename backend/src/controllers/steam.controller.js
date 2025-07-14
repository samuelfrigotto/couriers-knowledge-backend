const steamService = require('../services/steam.service');
const db = require('../config/database');

exports.getMatchHistory = async (req, res) => {
    const userSteamId = req.user.steam_id; // Do nosso token JWT
    try {
        const history = await steamService.getMatchHistory(userSteamId);
        res.status(200).json(history);
    } catch (error) {
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