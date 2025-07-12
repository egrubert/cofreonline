const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const flash = require('connect-flash'); // Adicionado

// Configuração do app
const app = express();

// Configuração da view engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de sessão (simplificada)
app.use(session({
    secret: 'seuSegredoSuperSecreto',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Defina como true em produção com HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 1 dia
    }
}));

// Configuração do flash messages (DEVE vir após a sessão)
app.use(flash());

// Middleware para definir variáveis padrão para todas as views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

// Rotas
app.use('/', require('./routes/mainRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/documents', require('./routes/documents'));

// Middleware de erro 404
app.use((req, res, next) => {
    res.status(404).render('error', {
        title: 'Página não encontrada',
        message: 'A página que você está procurando não existe.'
    });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Erro no servidor',
        message: 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.'
    });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});