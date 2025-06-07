const User = require('../models/User');
const bcrypt = require('bcryptjs');

const authController = {
    showLogin: (req, res) => {
        res.render('auth', { 
            formType: 'login',
            title: 'Login - CofreOnline'
        });
    },

    showRegister: (req, res) => {
        res.render('auth', { 
            formType: 'register',
            title: 'Registro - CofreOnline'
        });
    },

    login: async (req, res) => {
        // Implementação do login
    },

    register: async (req, res) => {
        // Implementação do registro
    },

    logout: (req, res) => {
        req.session.destroy();
        res.redirect('/');
    }
};

module.exports = authController;