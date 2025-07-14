const axios = require('axios');
const db = require('../config/database');

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_API_BASE_URL = 'https://api.steampowered.com';

function convertAccountIdToSteamId64(accountId) {
    if (!accountId || typeof accountId !== 'number' || accountId <= 0 || accountId === 4294967295) {
        return null;
    }
    return (BigInt(76561197960265728) + BigInt(accountId)).toString();
}

// Esta função precisa ser exportada
async function getPlayerSummaries(steamIds) {
    if (!steamIds || steamIds.length === 0) return [];
    
    const url = `${STEAM_API_BASE_URL}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamIds.join(',')}`;
    try {
        const response = await axios.get(url, { timeout: 5000 });
        return response.data.response.players || [];
    } catch (error) {
        console.error(`Falha ao buscar PlayerSummaries. Erro: ${error.message}`);
        return [];
    }
}

async function getMatchHistory(steamId, limit = 25) {
    // Convertendo o steamId 64 para 32, que é o que a OpenDota usa nesta rota
    const accountId = (BigInt(steamId) - BigInt(76561197960265728)).toString();
    
    const url = `https://api.opendota.com/api/players/${accountId}/matches?limit=${limit}`;
    try {
        const response = await axios.get(url);
        // A resposta já contém herói, resultado, duração, etc.
        return response.data || [];
    } catch (error) {
        console.error("Erro ao buscar histórico de partidas da OpenDota:", error.message);
        return [];
    }
}

// Usando OpenDota para detalhes da partida
async function getMatchDetails(matchId, authorId) {
    const OPENDOTA_API_BASE_URL = 'https://api.opendota.com/api';
    const url = `${OPENDOTA_API_BASE_URL}/matches/${matchId}`;
    let matchData;
    try {
        const response = await axios.get(url, { timeout: 10000 });
        matchData = response.data;
    } catch (error) {
        console.error(`Erro ao buscar detalhes da partida ${matchId} na API da OpenDota:`, error.message);
        throw new Error('Não foi possível obter os detalhes da partida da API da OpenDota.');
    }

    if (!matchData || !matchData.players) {
        throw new Error('A API da OpenDota não retornou dados de jogadores para esta partida.');
    }

    const evaluatedPlayersQuery = `
        SELECT p.steam_id 
        FROM evaluations e
        JOIN players p ON e.player_id = p.id
        WHERE e.author_id = $1 AND e.match_id = $2;
    `;
    const { rows: evaluatedRows } = await db.query(evaluatedPlayersQuery, [authorId, matchId]);
    const evaluatedSteamIds = new Set(evaluatedRows.map(r => r.steam_id));

    const finalDetails = matchData.players.map(player => {
        const steamId64 = convertAccountIdToSteamId64(player.account_id);
        return {
            steam_id_32: player.account_id,
            steam_id_64: steamId64,
            personaname: player.personaname || 'Jogador Anônimo',
            avatar: player.avatarfull || null,
            hero_id: player.hero_id,
            is_radiant: player.isRadiant,
            win: player.win,
            lose: player.lose,
            items: [
                player.item_0, player.item_1, player.item_2, 
                player.item_3, player.item_4, player.item_5
            ],
            backpack: [
                player.backpack_0, player.backpack_1, player.backpack_2
            ],
            net_worth: player.net_worth,
            is_already_evaluated: steamId64 ? evaluatedSteamIds.has(steamId64) : false
        };
    });

    return finalDetails;
}

// NOVA FUNÇÃO: Atualiza os nomes no banco de dados a partir de uma lista de IDs
async function updatePlayerNamesFromSteam(steamIds) {
    if (!steamIds || steamIds.length === 0) {
        return { updated: 0 };
    }

    // A API da Steam aceita até 100 IDs por chamada
    const batchSize = 100;
    let updatedCount = 0;

    for (let i = 0; i < steamIds.length; i += batchSize) {
        const batch = steamIds.slice(i, i + batchSize);
        const summaries = await getPlayerSummaries(batch);

        if (summaries && summaries.length > 0) {
            // Prepara uma única query de UPDATE para todo o batch
            const updatePromises = summaries.map(player => {
                const query = 'UPDATE players SET last_known_name = $1 WHERE steam_id = $2';
                return db.query(query, [player.personaname, player.steamid]);
            });
            
            // Executa todas as atualizações em paralelo
            const results = await Promise.all(updatePromises);
            updatedCount += results.filter(r => r.rowCount > 0).length;
        }
    }
    return { updated: updatedCount };
}


// Exportando todas as funções que precisam ser usadas por outros arquivos
module.exports = {
    getPlayerSummaries,
    getMatchHistory,
    getMatchDetails,
    updatePlayerNamesFromSteam
};