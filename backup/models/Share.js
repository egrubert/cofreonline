const pool = require('../config/db');

class Share {
    static async create({ documento_id, cpf_destinatario, pode_visualizar, pode_baixar }) {
        const [result] = await pool.execute(
            'INSERT INTO compartilhamentos (documento_id, cpf_destinatario, pode_visualizar, pode_baixar) VALUES (?, ?, ?, ?)',
            [documento_id, cpf_destinatario, pode_visualizar, pode_baixar]
        );
        return result;
    }

    static async findByUser(cpf) {
        const [rows] = await pool.execute(
            `SELECT c.*, d.nome as documento_nome, u.nome as usuario_nome 
             FROM compartilhamentos c
             JOIN documentos d ON c.documento_id = d.id
             JOIN usuarios u ON d.usuario_id = u.id
             WHERE c.cpf_destinatario = ?`,
            [cpf]
        );
        return rows;
    }

    static async findByDocument(documento_id) {
        const [rows] = await pool.execute(
            'SELECT * FROM compartilhamentos WHERE documento_id = ?',
            [documento_id]
        );
        return rows;
    }

    static async checkPermission(documento_id, cpf, action) {
        const [rows] = await pool.execute(
            `SELECT pode_${action === 'download' ? 'baixar' : 'visualizar'} as permissao 
             FROM compartilhamentos 
             WHERE documento_id = ? AND cpf_destinatario = ?`,
            [documento_id, cpf]
        );
        return rows.length > 0 && rows[0].permissao;
    }
}

module.exports = Share;