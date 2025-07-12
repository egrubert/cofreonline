const pool = require('../config/db');

class ReleaseRule {
    static async create({ documento_id, tipo_regra, data_liberacao, status }) {
        const [result] = await pool.execute(
            'INSERT INTO regras_liberacao (documento_id, tipo_regra, data_liberacao, status) VALUES (?, ?, ?, ?)',
            [documento_id, tipo_regra, data_liberacao, status]
        );
        return result;
    }

    static async addApprover(regra_id, cpf_aprovador) {
        const [result] = await pool.execute(
            'INSERT INTO aprovadores_regras (regra_id, cpf_aprovador) VALUES (?, ?)',
            [regra_id, cpf_aprovador]
        );
        return result;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM regras_liberacao WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async findByDocument(documento_id) {
        const [rows] = await pool.execute(
            'SELECT * FROM regras_liberacao WHERE documento_id = ?',
            [documento_id]
        );
        return rows;
    }

    static async approve(regra_id, cpf_aprovador) {
        const [result] = await pool.execute(
            'UPDATE aprovadores_regras SET aprovado = TRUE, data_aprovacao = NOW() WHERE regra_id = ? AND cpf_aprovador = ?',
            [regra_id, cpf_aprovador]
        );
        return result;
    }

    static async checkAllApproved(regra_id) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as total, SUM(aprovado) as aprovados FROM aprovadores_regras WHERE regra_id = ?',
            [regra_id]
        );
        return rows.length > 0 && rows[0].total === rows[0].aprovados;
    }

    static async updateStatus(regra_id, status) {
        const [result] = await pool.execute(
            'UPDATE regras_liberacao SET status = ? WHERE id = ?',
            [status, regra_id]
        );
        return result;
    }
}

module.exports = ReleaseRule;