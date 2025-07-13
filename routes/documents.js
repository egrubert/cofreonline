const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const upload = require('../config/multer');

// Certifique-se de que documentController tem todas as funções necessárias
router.get('/', documentController.list);
router.post('/upload', upload.single('document'), documentController.upload);
router.get('/share/:id', documentController.showShareForm);
router.post('/share', documentController.share);
router.get('/rules/:id', documentController.showRulesForm);
router.post('/rules', documentController.createRule);
router.post('/approve', documentController.approve);
router.get('/download/:id', documentController.download);

router.get('/approve/:id', documentController.showApprovalForm);
router.post('/approve', documentController.approve);


module.exports = router;