const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', { 
        title: 'CofreOnline - Seu testamento digital',
        user: req.session.user 
    });
});

router.get('/editor', (req, res) => {
    res.render('editor', { 
        title: 'Editor - CofreOnline',
        user: req.session.user,
        isEditorPage: true
    });
});

module.exports = router;