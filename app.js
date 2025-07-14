const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const flash = require('connect-flash');

// Inicialização do app
const app = express();

// Configuração da view engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'seuSegredoSuperSecreto',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000 // 1 dia
    }
}));

// Flash messages
app.use(flash());

// Variáveis globais para views
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

// Tratamento de erro 404
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Página não encontrada',
        message: 'A página que você está procurando não existe.',
        user: req.session.user || null
    });
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error(`Erro: ${err.stack}`);
    res.status(500).render('error', {
        title: 'Erro no servidor',
        message: 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.',
        user: req.session.user || null
    });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});