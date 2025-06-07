const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', { 
        title: 'CofreOnline - Seu testamento digital',
        user: req.session.user 
    });
});

module.exports = router;