// backend/src/controllers/evaluation.controller.js
const db = require('../config/database');
const steamService = require('../services/steam.service');

exports.createEvaluation = async (req, res) => {
    const authorId = req.user.id;
    const { targetSteamId, rating, notes, matchId, role, hero_id, tags } = req.body;

    // --- INÍCIO DA VALIDAÇÃO ---
    if (notes && notes.length > 200) {
        return res.status(400).json({ message: 'A anotação não pode exceder 200 caracteres.' });
    }
    if (tags) {
        if (tags.length > 5) {
            return res.status(400).json({ message: 'Você pode adicionar no máximo 5 tags.' });
        }
        for (const tag of tags) {
            if (tag.length > 25) {
                return res.status(400).json({ message: 'Cada tag não pode exceder 25 caracteres.' });
            }
        }
    }
    
    if (!targetSteamId) {
        return res.status(400).json({ message: 'targetSteamId is required.' });
    }

    try {
        const playerSummaries = await steamService.getPlayerSummaries([targetSteamId]);
        const playerName = playerSummaries.length > 0 ? playerSummaries[0].personaname : 'Jogador Desconhecido';

        const playerQuery = `
            INSERT INTO players (steam_id, last_known_name) VALUES ($1, $2)
            ON CONFLICT (steam_id) DO UPDATE SET last_known_name = EXCLUDED.last_known_name
            RETURNING id;
        `;
        const { rows: playerRows } = await db.query(playerQuery, [targetSteamId, playerName]);
        const playerId = playerRows[0].id;

        const evaluationQuery = `
            INSERT INTO evaluations (author_id, player_id, rating, notes, match_id, role, hero_id, tags)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *; 
        `;
        // Adicionando os novos valores
        const values = [authorId, playerId, rating, notes, matchId || null, role || null, hero_id || null, tags || null];
        const { rows: evaluationRows } = await db.query(evaluationQuery, values);

        res.status(201).json(evaluationRows[0]);

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Conflict: An evaluation for this player in this match already exists.' });
        }
        console.error('Error creating evaluation:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// FUNÇÃO GET MY EVALUATIONS ATUALIZADA
exports.getMyEvaluations = async (req, res) => {
    const authorId = req.user.id;
    try {
        // Adicionando os novos campos ao SELECT
        const query = `
            SELECT
                e.id, e.rating, e.notes, e.match_id, e.created_at, e.role, e.hero_id, e.tags,
                p.steam_id AS "targetSteamId",
                p.last_known_name AS "targetPlayerName"
            FROM evaluations e
            JOIN players p ON e.player_id = p.id
            WHERE e.author_id = $1
            ORDER BY e.created_at DESC;
        `;
        const { rows } = await db.query(query, [authorId]);
        res.status(200).json(rows);
    } catch (error) {
        // ... (código de erro existente)
    }
};

// FUNÇÃO GET PLAYER EVALUATIONS ATUALIZADA
exports.getPlayerEvaluations = async (req, res) => {
    const { steamId } = req.params;
    try {
        // Adicionando os novos campos ao SELECT
        const query = `
            SELECT
                e.id, e.rating, e.notes, e.match_id, e.created_at, e.role, e.hero_id, e.tags,
                u.steam_username AS "authorName",
                u.avatar_url AS "authorAvatar"
            FROM evaluations e
            JOIN players p ON e.player_id = p.id
            JOIN users u ON e.author_id = u.id
            WHERE p.steam_id = $1
            ORDER BY e.created_at DESC;
        `;
        const { rows } = await db.query(query, [steamId]);
        res.status(200).json(rows);
    } catch (error) {
        // ... (código de erro existente)
    }
};

// FUNÇÃO UPDATE ATUALIZADA
exports.updateEvaluation = async (req, res) => {
    const evaluationId = req.params.id;
    const authorId = req.user.id;
    // Adicionando os novos campos do corpo da requisição
    const { rating, notes, role, hero_id, tags } = req.body;
    try {
        const query = `
            UPDATE evaluations
            SET rating = $1, notes = $2, role = $3, hero_id = $4, tags = $5, updated_at = NOW()
            WHERE id = $6 AND author_id = $7
            RETURNING *;
        `;
        const values = [rating, notes, role || null, hero_id || null, tags || null, evaluationId, authorId];
        const { rows, rowCount } = await db.query(query, values);

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Evaluation not found or user not authorized to edit.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        // ... (código de erro existente)
    }
};


exports.deleteEvaluation = async (req, res) => {
    const evaluationId = req.params.id;
    const authorId = req.user.id;

    try {
        const query = `
            DELETE FROM evaluations
            WHERE id = $1 AND author_id = $2;
        `;
        const { rowCount } = await db.query(query, [evaluationId, authorId]);

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Evaluation not found or user not authorized to delete.' });
        }

        // Status 204 No Content é o padrão para um delete bem-sucedido.
        res.status(204).send();

    } catch (error) {
        console.error('Error deleting evaluation:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

exports.getUniqueTags = async (req, res) => {
    const authorId = req.user.id;
    try {
        // A query usa UNNEST para transformar os arrays de tags em linhas e depois pega os valores distintos
        const query = `
            SELECT DISTINCT UNNEST(tags) AS tag 
            FROM evaluations 
            WHERE author_id = $1 AND tags IS NOT NULL
            ORDER BY tag;
        `;
        const { rows } = await db.query(query, [authorId]);
        // Mapeia o resultado para um array simples de strings
        res.status(200).json(rows.map(r => r.tag));
    } catch (error) {
        console.error('Erro ao buscar tags únicas:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};