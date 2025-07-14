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