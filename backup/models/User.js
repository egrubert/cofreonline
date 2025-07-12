const pool = require('../config/db');

class User {
    static async create({ nome, email, cpf, senha }) {
        const [result] = await pool.execute(
            'INSERT INTO usuarios (nome, email, cpf, senha) VALUES (?, ?, ?, ?)',
            [nome, email, cpf, senha]
        );
        return result;
    }

    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async findByCpf(cpf) {
        const [rows] = await pool.execute(
            'SELECT * FROM usuarios WHERE cpf = ?',
            [cpf]
        );
        return rows[0];
    }
}

module.exports = User;