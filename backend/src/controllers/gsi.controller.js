const db = require('../config/database');

// Função que recebe uma lista de jogadores e retorna seus dados de avaliação
exports.getPlayerStats = async (req, res) => {
    const authorId = req.user.id;
    // Recebemos a lista de SteamIDs do corpo da requisição
    const { steamIds } = req.body;

    if (!steamIds || !Array.isArray(steamIds) || steamIds.length === 0) {
        return res.status(400).json({ message: 'A lista de SteamIDs é inválida.' });
    }

    try {
        // Esta query complexa busca a média e a contagem de avaliações para a lista de IDs fornecida
        const query = `
            SELECT 
                p.steam_id, 
                AVG(e.rating) as average_rating, 
                COUNT(e.id) as evaluation_count
            FROM evaluations e
            JOIN players p ON e.player_id = p.id
            WHERE e.author_id = $1 AND p.steam_id = ANY($2::bigint[])
            GROUP BY p.steam_id;
        `;

        const { rows } = await db.query(query, [authorId, steamIds]);

        // Transforma o resultado em um mapa para fácil acesso (SteamID -> Stats)
        const statsMap = rows.reduce((acc, row) => {
            acc[row.steam_id] = {
                averageRating: parseFloat(row.average_rating).toFixed(1),
                evaluationCount: parseInt(row.evaluation_count, 10)
            };
            return acc;
        }, {});

        res.status(200).json(statsMap);

    } catch (error) {
        console.error('Erro ao buscar estatísticas de jogadores do GSI:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};