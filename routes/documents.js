const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const upload = require('../config/multer');

// Importar modelos necessários para o middleware
const Document = require('../models/Document');
const Share = require('../models/Share');
const ReleaseRule = require('../models/ReleaseRule');

// Middleware de verificação de acesso
const checkDocumentAccess = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const userId = req.session.user?.id;
    const userCpf = req.session.user?.cpf;

    if (!userId || !userCpf) {
      req.flash('error', 'Usuário não autenticado');
      return res.redirect('/auth/login');
    }

    const document = await Document.findById(documentId);
    if (!document) {
      req.flash('error', 'Documento não encontrado');
      return res.redirect('/documents');
    }

    if (document.usuario_id === userId) return next();

    const shared = await Share.findByDocumentAndCpf(documentId, userCpf);
    if (!shared) {
      req.flash('error', 'Acesso não autorizado');
      return res.redirect('/documents');
    }

    const isReleased = await ReleaseRule.isDocumentReleased(documentId);
    if (!isReleased) {
      req.flash('error', 'Documento bloqueado por regras de liberação');
      return res.redirect('/documents');
    }

    next();
  } catch (error) {
    console.error('Document access error:', error);
    req.flash('error', 'Erro ao verificar acesso ao documento');
    res.redirect('/documents');
  }
};

// Rotas principais
router.get('/', documentController.list);
router.post('/upload', upload.single('document'), documentController.upload);

// Rotas protegidas por checkDocumentAccess
router.get('/share/:id', checkDocumentAccess, documentController.showShareForm);
router.post('/share', documentController.share);

router.get('/rules/:id', checkDocumentAccess, documentController.showRulesForm);
router.post('/rules', documentController.createRule);

router.get('/approve/:id', checkDocumentAccess, documentController.showApprovalForm);
router.post('/approve', documentController.approve);

router.get('/download/:id', checkDocumentAccess, documentController.download);

// Rotas de exclusão
//router.get('/delete/:id', checkDocumentAccess, documentController.delete);
//router.post('/delete', documentController.deleteMultiple);

module.exports = router;