const Document = require('../models/Document');
const Share = require('../models/Share');
const ReleaseRule = require('../models/ReleaseRule');
const fs = require('fs');
const path = require('path');

module.exports = {
    // Listar documentos do usuário
    list: async (req, res) => {
        try {
            const myDocuments = await Document.findByUser(req.session.user.id);
            const sharedWithMe = await Share.findByUser(req.session.user.cpf);
            
            res.render('documents/list', {
                title: 'Meus Documentos',
                user: req.session.user,
                myDocuments,
                sharedWithMe
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Erro ao carregar documentos');
        }
    },

    // Upload de documento
    upload: async (req, res) => {
        try {
            if (!req.files || !req.files.document) {
                return res.status(400).send('Nenhum arquivo enviado');
            }

            const file = req.files.document;
            const uploadPath = path.join(__dirname, '../public/uploads', file.name);

            await file.mv(uploadPath);

            const document = await Document.create({
                nome: req.body.name || file.name,
                caminho_arquivo: `/uploads/${file.name}`,
                tamanho: file.size,
                tipo: file.mimetype,
                usuario_id: req.session.user.id
            });

            res.redirect('/documents');
        } catch (error) {
            console.error(error);
            res.status(500).send('Erro no upload');
        }
    },

    // Compartilhar documento
    share: async (req, res) => {
        try {
            const { documentId, cpf, canView, canDownload } = req.body;
            
            await Share.create({
                documento_id: documentId,
                cpf_destinatario: cpf,
                pode_visualizar: canView === 'on',
                pode_baixar: canDownload === 'on'
            });

            res.redirect(`/documents/share/${documentId}?success=1`);
        } catch (error) {
            console.error(error);
            res.redirect(`/documents/share/${documentId}?error=1`);
        }
    },

    // Criar regra de liberação
    createRule: async (req, res) => {
        try {
            const { documentId, ruleType, approvers, releaseDate } = req.body;
            
            const rule = await ReleaseRule.create({
                documento_id: documentId,
                tipo_regra: ruleType,
                data_liberacao: ruleType === 'DATA' ? releaseDate : null,
                status: 'PENDENTE'
            });

            // Adicionar aprovadores
            if (ruleType === 'ALGUNS' && approvers) {
                const approversList = Array.isArray(approvers) ? approvers : [approvers];
                for (const cpf of approversList) {
                    await ReleaseRule.addApprover(rule.id, cpf);
                }
            }

            res.redirect(`/documents/rules/${documentId}?success=1`);
        } catch (error) {
            console.error(error);
            res.redirect(`/documents/rules/${documentId}?error=1`);
        }
    },

    // Aprovar liberação
    approve: async (req, res) => {
        try {
            const { ruleId } = req.body;
            
            await ReleaseRule.approve(ruleId, req.session.user.cpf);
            
            // Verificar se todas as aprovações foram concluídas
            const rule = await ReleaseRule.findById(ruleId);
            const allApproved = await ReleaseRule.checkAllApproved(ruleId);
            
            if (allApproved) {
                await ReleaseRule.updateStatus(ruleId, 'LIBERADO');
            }

            res.redirect('/documents?approved=1');
        } catch (error) {
            console.error(error);
            res.redirect('/documents?error=1');
        }
    },

    // Download de documento
    download: async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            
            // Verificar permissões
            const canDownload = await Share.checkPermission(
                document.id, 
                req.session.user.cpf, 
                'download'
            );
            
            if (!canDownload) {
                return res.status(403).send('Acesso não autorizado');
            }

            const filePath = path.join(__dirname, '../public', document.caminho_arquivo);
            res.download(filePath, document.nome);
        } catch (error) {
            console.error(error);
            res.status(500).send('Erro ao baixar arquivo');
        }
    }
        // Mostrar formulário de compartilhamento
    showShareForm: async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            const shares = await Share.findByDocument(req.params.id);
            
            res.render('documents/share', {
                title: 'Compartilhar Documento',
                user: req.session.user,
                document,
                shares,
                error: req.query.error ? 'Erro ao compartilhar' : null,
                success: req.query.success ? true : false
            });
        } catch (error) {
            console.error(error);
            res.redirect('/documents?error=1');
        }
    },

    // Mostrar formulário de regras
    showRulesForm: async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            const rules = await ReleaseRule.findByDocument(req.params.id);
            
            res.render('documents/rules', {
                title: 'Regras de Liberação',
                user: req.session.user,
                document,
                rules,
                error: req.query.error ? 'Erro ao criar regra' : null,
                success: req.query.success ? true : false
            });
        } catch (error) {
            console.error(error);
            res.redirect('/documents?error=1');
        }
    }
};