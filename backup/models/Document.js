const pool = require('../config/db');

class Document {
    static async create({ nome, caminho_arquivo, tamanho, tipo, usuario_id }) {
        const [result] = await pool.execute(
            'INSERT INTO documentos (nome, caminho_arquivo, tamanho, tipo, usuario_id) VALUES (?, ?, ?, ?, ?)',
            [nome, caminho_arquivo, tamanho, tipo, usuario_id]
        );
        return result;
    }

    static async findByUser(usuario_id) {
        const [rows] = await pool.execute(
            'SELECT * FROM documentos WHERE usuario_id = ?',
            [usuario_id]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM documentos WHERE id = ?',
            [id]
        );
        return rows[0];
    }
}

module.exports = Document;