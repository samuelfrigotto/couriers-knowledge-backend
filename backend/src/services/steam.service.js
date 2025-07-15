const axios = require('axios');
const db = require('../config/database');

const STEAM_API_KEY = process.env.STEAM_API_KEY;

function convertAccountIdToSteamId64(accountId) {
    if (!accountId || typeof accountId !== 'number' || accountId <= 0 || accountId === 4294967295) {
        return null;
    }
    return (BigInt(76561197960265728) + BigInt(accountId)).toString();
}

async function getPlayerSummaries(steamIds) {
    if (!steamIds || steamIds.length === 0) return [];
    
    const STEAM_API_BASE_URL = 'https://api.steampowered.com';
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
    const OPENDOTA_API_BASE_URL = 'https://api.opendota.com/api';
    const accountId = (BigInt(steamId) - BigInt(76561197960265728)).toString();
    const url = `${OPENDOTA_API_BASE_URL}/players/${accountId}/matches?limit=${limit}`;
    try {
        const response = await axios.get(url);
        return response.data || [];
    } catch (error) {
        console.error("Erro ao buscar histórico de partidas da OpenDota:", error.message);
        return [];
    }
}

async function getMatchDetails(matchId, authorId) {
    const OPENDOTA_API_BASE_URL = 'https://api.opendota.com/api';
    const url = `${OPENDOTA_API_BASE_URL}/matches/${matchId}`;
    let matchData;
    try {
        const response = await axios.get(url, { timeout: 10000 });
        matchData = response.data;
    } catch (error) {
        throw new Error('Não foi possível obter os detalhes da partida da API da OpenDota.');
    }

    if (!matchData || !matchData.players) {
        throw new Error('A API da OpenDota não retornou dados de jogadores para esta partida.');
    }

    // CORREÇÃO: Vamos retornar o objeto de dados da partida inteiro.
    // O controller vai precisar dos jogadores e do placar.
    return matchData;
}


async function updatePlayerNamesFromSteam(steamIds) {
    if (!steamIds || steamIds.length === 0) return { updated: 0 };
    const batchSize = 100;
    let updatedCount = 0;
    for (let i = 0; i < steamIds.length; i += batchSize) {
        const batch = steamIds.slice(i, i + batchSize);
        const summaries = await getPlayerSummaries(batch);
        if (summaries && summaries.length > 0) {
            const updatePromises = summaries.map(player => {
                const query = 'UPDATE players SET last_known_name = $1 WHERE steam_id = $2';
                return db.query(query, [player.personaname, player.steamid]);
            });
            const results = await Promise.all(updatePromises);
            updatedCount += results.filter(r => r.rowCount > 0).length;
        }
    }
    return { updated: updatedCount };
}

module.exports = {
    getPlayerSummaries,
    getMatchHistory,
    getMatchDetails,
    updatePlayerNamesFromSteam
};