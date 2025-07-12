const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Middleware para garantir que user esteja disponível
router.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

router.get('/login', (req, res) => {
    res.render('auth', {
        formType: 'login',
        title: 'Login - CofreOnline',
        user: null,
        success: req.query.registered ? 'Cadastro realizado com sucesso! Faça login.' : null
    });
});

router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.get('/register', authController.showRegister);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

module.exports = router;