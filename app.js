const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

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
    cookie: { secure: false } // Defina como true em produção com HTTPS
}));

// Middleware para definir variáveis padrão para todas as views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.error = null;
    res.locals.success = null;
    next();
});
// Rotas
app.use('/', require('./routes/mainRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/documents', require('./routes/documents'));

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});