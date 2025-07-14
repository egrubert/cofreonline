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
            `SELECT 
                c.*, 
                d.nome as documento_nome, 
                u.nome as usuario_nome, 
                r.status as regra_status, 
                r.id as regra_id, 
                r.tipo_regra,
                r.data_liberacao,
                (SELECT COUNT(*) FROM aprovadores_regras ar 
                 WHERE ar.regra_id = r.id AND ar.cpf_aprovador = ? AND ar.aprovado = 0) as precisa_minha_aprovacao,
                (SELECT COUNT(*) FROM aprovadores_regras ar 
                 WHERE ar.regra_id = r.id) as total_aprovadores,
                (SELECT COUNT(*) FROM aprovadores_regras ar 
                 WHERE ar.regra_id = r.id AND ar.aprovado = 1) as aprovadores_confirmados
             FROM compartilhamentos c
             JOIN documentos d ON c.documento_id = d.id
             JOIN usuarios u ON d.usuario_id = u.id
             LEFT JOIN regras_liberacao r ON r.documento_id = d.id
             WHERE c.cpf_destinatario = ?`,
            [cpf, cpf]
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
        // Primeiro verifica se o documento está liberado
        const [releaseRules] = await pool.execute(
            'SELECT status FROM regras_liberacao WHERE documento_id = ?',
            [documento_id]
        );

        // Se existir regra e não estiver liberado, nega a permissão
        if (releaseRules.length > 0 && releaseRules[0].status !== 'LIBERADO') {
            return false;
        }

        // Verifica a permissão específica no compartilhamento
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

    /**
     * Busca documentos pendentes de aprovação pelo usuário
     */
    static async findPendingApprovals(cpfAprovador) {
        const [rows] = await pool.execute(
            `SELECT 
                d.id as documento_id,
                d.nome as documento_nome,
                u.nome as dono_nome,
                r.id as regra_id,
                r.tipo_regra,
                (SELECT COUNT(*) FROM aprovadores_regras ar 
                 WHERE ar.regra_id = r.id AND ar.aprovado = 1) as aprovados,
                (SELECT COUNT(*) FROM aprovadores_regras ar 
                 WHERE ar.regra_id = r.id) as total_aprovadores
             FROM aprovadores_regras ar
             JOIN regras_liberacao r ON ar.regra_id = r.id
             JOIN documentos d ON r.documento_id = d.id
             JOIN usuarios u ON d.usuario_id = u.id
             WHERE ar.cpf_aprovador = ? AND ar.aprovado = 0
             AND r.status = 'PENDENTE'`,
            [cpfAprovador]
        );
        return rows;
    }
}

module.exports = Share;