// backend/src/controllers/health.controller.js
const db = require('../config/database');

// Função para formatar o tempo de atividade em um formato legível
const formatUptime = (seconds) => {
    const pad = (s) => (s < 10 ? '0' : '') + s;
    const hours = Math.floor(seconds / (60*60));
    const minutes = Math.floor(seconds % (60*60) / 60);
    const secs = Math.floor(seconds % 60);
    return `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
}

exports.getHealthStatus = async (req, res) => {
    const healthcheck = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: formatUptime(process.uptime()),
        dependencies: {
            database: {
                status: 'UP',
                responseTime: null,
            },
        },
    };

    try {
        const startTime = process.hrtime();
        await db.query('SELECT 1'); // Query mais leve que SELECT NOW()
        const endTime = process.hrtime(startTime);
        
        // Converte o tempo de resposta para milissegundos
        const responseTimeInMs = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2);
        healthcheck.dependencies.database.responseTime = `${responseTimeInMs}ms`;

        // Se tudo deu certo, retorna o status 200 OK com os detalhes
        return res.status(200).json(healthcheck);

    } catch (error) {
        // Se a conexão com o banco falhar, atualizamos o status
        healthcheck.status = 'DOWN';
        healthcheck.dependencies.database.status = 'DOWN';
        healthcheck.dependencies.database.error = error.message;

        console.error('Health check failed:', error);

        // Retorna o status 503 Service Unavailable
        return res.status(503).json(healthcheck);
    }
};