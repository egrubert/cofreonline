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

    static async delete(documento_id, cpf_destinatario) {
        const [result] = await pool.execute(
            'DELETE FROM compartilhamentos WHERE documento_id = ? AND cpf_destinatario = ?',
            [documento_id, cpf_destinatario]
        );
        return result;
    }
    static async deleteByDocument(documento_id) {
        const [result] = await pool.execute(
            'DELETE FROM compartilhamentos WHERE documento_id = ?',
            [documento_id]
        );
        return result;
    }
    static async deleteByCpf(cpf_destinatario) {
        const [result] = await pool.execute(
            'DELETE FROM compartilhamentos WHERE cpf_destinatario = ?',
            [cpf_destinatario]
        );
        return result;
    }
    static async deleteByDocumentAndCpf(documento_id, cpf_destinatario) {
        const [result] = await pool.execute(
            'DELETE FROM compartilhamentos WHERE documento_id = ? AND cpf_destinatario = ?',
            [documento_id, cpf_destinatario]
        );
        return result;
    }
    static async update(documento_id, cpf_destinatario, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(documento_id, cpf_destinatario);
        
        const [result] = await pool.execute(
            `UPDATE compartilhamentos SET ${fields} WHERE documento_id = ? AND cpf_destinatario = ?`,
            values
        );
        return result;
    }
    static async findByCpf(cpf_destinatario) {
        const [rows] = await pool.execute(
            'SELECT * FROM compartilhamentos WHERE cpf_destinatario = ?',
            [cpf_destinatario]
        );
        return rows;
    }
    static async findByDocumentAndCpf(documento_id, cpf_destinatario) {
        const [rows] = await pool.execute(
            'SELECT * FROM compartilhamentos WHERE documento_id = ? AND cpf_destinatario = ?',
            [documento_id, cpf_destinatario]
        );
        return rows;
    }
    static async findByDocumentAndCpfWithUser(documento_id, cpf_destinatario) {
        const [rows] = await pool.execute(
            `SELECT c.*, d.nome as documento_nome, u.nome as usuario_nome 
             FROM compartilhamentos c
             JOIN documentos d ON c.documento_id = d.id
             JOIN usuarios u ON d.usuario_id = u.id
             WHERE c.documento_id = ? AND c.cpf_destinatario = ?`,
            [documento_id, cpf_destinatario]
        );
        return rows; 
    }    

    static async findByUser(cpf) {
        const [rows] = await pool.execute(
            `SELECT c.*, d.nome as documento_nome, u.nome as usuario_nome, 
            r.status as regra_status, r.id as regra_id, r.tipo_regra,
            (SELECT COUNT(*) FROM aprovadores_regras ar 
            WHERE ar.regra_id = r.id AND ar.cpf_aprovador = ? AND ar.aprovado = 0) as precisa_minha_aprovacao
            FROM compartilhamentos c
            JOIN documentos d ON c.documento_id = d.id
            JOIN usuarios u ON d.usuario_id = u.id
            LEFT JOIN regras_liberacao r ON r.documento_id = d.id
            WHERE c.cpf_destinatario = ?`,
            [cpf, cpf]
        );
        return rows;
    }


}

module.exports = Share;