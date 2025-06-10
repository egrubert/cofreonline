const User = require('../models/User');
const bcrypt = require('bcryptjs');

const authController = {
    showLogin: (req, res) => {
        res.render('auth', { 
            formType: 'login',
            title: 'Login - CofreOnline',
            user: req.session.user || null,
            error: req.query.error ? 'Credenciais inválidas' : null,
            success: req.query.registered ? 'Cadastro realizado com sucesso! Faça login.' : null,
            redirectTo: req.query.redirectTo || '/'
        });
    },

    showRegister: (req, res) => {
        res.render('auth', { 
            formType: 'register',
            title: 'Registro - CofreOnline',
            user: req.session.user || null,
            error: null, // Garante que error existe
            success: null // Garante que success existe
        });
    },

    login: async (req, res) => {
        try {
            const { email, senha } = req.body;
            const redirectTo = req.body.redirectTo || '/';

            // 1. Verificar se usuário existe
            const user = await User.findByEmail(email);
            if (!user) {
                return res.redirect('/auth/login?error=1');
            }

            // 2. Validar senha
            const isPasswordValid = await bcrypt.compare(senha, user.senha);
            if (!isPasswordValid) {
                return res.redirect('/auth/login?error=1');
            }

            // 3. Criar sessão
            req.session.user = {
                id: user.id,
                nome: user.nome,
                email: user.email,
                cpf: user.cpf
            };

            // 4. Redirecionar
            res.redirect(redirectTo);

        } catch (error) {
            console.error('Erro no login:', error);
            res.redirect('/auth/login?error=1');
        }
    },

    register: async (req, res) => {
        try {
            const { nome, email, cpf, senha } = req.body;
            // Verifica se usuário já existe
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.render('auth', {
                    formType: 'register',
                    title: 'Registro - CofreOnline',
                    user: null,
                    error: 'E-mail já cadastrado',
                    success: null
                });
            }
            
            // 1. Validações básicas
            if (!nome || !email || !cpf || !senha) {
                return res.render('auth', {
                    formType: 'register',
                    title: 'Registro - CofreOnline',
                    user: null,
                    error: 'Todos os campos são obrigatórios'
                });
            }

            // 2. Verificar se usuário já existe
            const existingUserByEmail = await User.findByEmail(email);
            if (existingUserByEmail) {
                return res.render('auth', {
                    formType: 'register',
                    title: 'Registro - CofreOnline',
                    user: null,
                    error: 'E-mail já cadastrado'
                });
            }

            const existingUserByCpf = await User.findByCpf(cpf);
            if (existingUserByCpf) {
                return res.render('auth', {
                    formType: 'register',
                    title: 'Registro - CofreOnline',
                    user: null,
                    error: 'CPF já cadastrado'
                });
            }

            // 3. Criptografar senha
            const hashedPassword = await bcrypt.hash(senha, 12);
            
            // 4. Criar usuário
            await User.create({
                nome,
                email,
                cpf,
                senha: hashedPassword
            });

            // 5. Redirecionar para login com mensagem de sucesso
            res.redirect('/auth/login?registered=true');

        }  catch (error) {
            console.error('Erro no registro:', error);
            res.render('auth', {
                formType: 'register',
                title: 'Registro - CofreOnline',
                user: null,
                error: 'Erro no cadastro. Tente novamente.',
                success: null
            });
        }
    },

    logout: (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Erro ao destruir sessão:', err);
                return res.redirect('/');
            }
            res.redirect('/auth/login');
        });
    }
};

module.exports = authController;