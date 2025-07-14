const Document = require('../models/Document');
const Share = require('../models/Share');
const ReleaseRule = require('../models/ReleaseRule');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

// Configuração do transporter de e-mail
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helpers
const documentHelpers = {
    /**
     * Verifica se usuário tem acesso ao documento
     */
    checkDocumentAccess: async (userId, cpf, documentId) => {
        const document = await Document.findById(documentId);
        if (!document) throw new Error('Documento não encontrado');

        // Dono tem acesso total
        if (document.usuario_id === userId) return { document, accessLevel: 'owner' };

        // Verifica compartilhamento
        const share = await Share.findByDocumentAndCpf(documentId, cpf);
        if (!share) throw new Error('Acesso não autorizado');

        return { document, accessLevel: share.pode_baixar ? 'download' : 'view' };
    },

    /**
     * Verifica se documento está liberado por regras
     */
    checkDocumentRules: async (documentId, userCpf) => {
        const rules = await ReleaseRule.findByDocument(documentId);
        if (rules.length === 0) return true; // Sem regras = liberado

        for (const rule of rules) {
            if (rule.status === 'LIBERADO') continue;

            if (rule.tipo_regra === 'DATA') {
                if (new Date() < new Date(rule.data_liberacao)) {
                    return false;
                }
            } else {
                const isApprover = await ReleaseRule.isUserApprover(rule.id, userCpf);
                if (isApprover && !await ReleaseRule.hasUserApproved(rule.id, userCpf)) {
                    return false;
                }
            }
        }

        return true;
    },

    /**
     * Cria regra familiar para documentos compartilhados
     */
    createFamilyRule: async (documentId, childrenCPFs) => {
        if (!Array.isArray(childrenCPFs) || childrenCPFs.length === 0) {
            throw new Error('Lista de CPFs inválida');
        }

        const rule = await ReleaseRule.create({
            documento_id: documentId,
            tipo_regra: 'TODOS',
            status: 'PENDENTE'
        });

        await Promise.all(
            childrenCPFs.map(cpf => ReleaseRule.addApprover(rule.id, cpf))
        );

        return rule;
    },

    /**
     * Envia notificação por e-mail
     */
    sendNotification: async (type, options) => {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: options.recipient,
                subject: '',
                html: ''
            };

            switch (type) {
                case 'approval':
                    mailOptions.subject = 'Documento Liberado - CofreOnline';
                    mailOptions.html = `
                        <p>O documento <strong>${options.documentName}</strong> foi liberado após todas as aprovações necessárias.</p>
                        <p><a href="${process.env.APP_URL}/documents/download/${options.documentId}">Clique aqui para acessar</a></p>
                    `;
                    break;
                
                case 'approval_request':
                    mailOptions.subject = 'Aprovação Pendente - CofreOnline';
                    mailOptions.html = `
                        <p>Você foi designado como aprovador para o documento <strong>${options.documentName}</strong>.</p>
                        <p><a href="${process.env.APP_URL}/documents/approve/${options.ruleId}">Clique aqui para aprovar</a></p>
                    `;
                    break;
            }

            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Erro ao enviar e-mail:', error);
        }
    }
};

module.exports = {
    /**
     * Lista documentos do usuário e compartilhados com ele
     */
    list: async (req, res) => {
        try {
            const [myDocuments, sharedWithMe] = await Promise.all([
                Document.findByUser(req.session.user.id),
                Share.findByUser(req.session.user.cpf)
            ]);
            
            // Adiciona status de liberação para documentos compartilhados
            const sharedWithStatus = await Promise.all(
                sharedWithMe.map(async doc => {
                    const isReleased = await documentHelpers.checkDocumentRules(doc.documento_id, req.session.user.cpf);
                    return { ...doc, isReleased };
                })
            );

            res.render('documents/list', {
                title: 'Meus Documentos',
                user: req.session.user,
                myDocuments,
                sharedWithMe: sharedWithStatus,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (error) {
            console.error('List error:', error);
            req.flash('error', 'Erro ao carregar documentos');
            res.redirect('/');
        }
    },

    /**
     * Upload de documento
     */
    upload: async (req, res) => {
        try {
            if (!req.file) {
                req.flash('error', 'Nenhum arquivo foi enviado');
                return res.redirect('/documents');
            }

            const file = req.file;
            const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
            const uploadPath = path.join(__dirname, '../public/uploads', uniqueName);

            // Valida tipo de arquivo
            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
            if (!allowedTypes.includes(file.mimetype)) {
                req.flash('error', 'Tipo de arquivo não permitido');
                return res.redirect('/documents');
            }

            await file.mv(uploadPath);

            const document = await Document.create({
                nome: req.body.name || path.parse(file.originalname).name,
                caminho_arquivo: `/uploads/${uniqueName}`,
                tamanho: file.size,
                tipo: file.mimetype,
                usuario_id: req.session.user.id
            });

            req.flash('success', 'Documento enviado com sucesso!');
            res.redirect('/documents');
        } catch (error) {
            console.error('Upload error:', error);
            req.flash('error', error.message || 'Falha no upload do documento');
            res.redirect('/documents');
        }
    },

    /**
     * Compartilha documento com outro usuário
     */
    share: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect(`/documents/share/${req.body.documentId}`);
        }

        try {
            const { documentId, cpf, canView, canDownload, childrenCPFs } = req.body;
            
            // Verifica se o usuário é o dono do documento
            const document = await Document.findById(documentId);
            if (document.usuario_id !== req.session.user.id) {
                req.flash('error', 'Acesso não autorizado');
                return res.redirect('/documents');
            }

            // Verifica se o destinatário existe
            const recipient = await User.findByCpf(cpf);
            if (!recipient && !childrenCPFs) {
                req.flash('error', 'Destinatário não encontrado. O usuário precisa se cadastrar primeiro.');
                return res.redirect(`/documents/share/${documentId}`);
            }

            await Share.create({
                documento_id: documentId,
                cpf_destinatario: cpf,
                pode_visualizar: canView === 'on',
                pode_baixar: canDownload === 'on'
            });

            // Cria regras familiares se houver CPFs de filhos
            if (childrenCPFs && childrenCPFs.length > 0) {
                await documentHelpers.createFamilyRule(documentId, childrenCPFs.split(','));
            }

            req.flash('success', 'Documento compartilhado com sucesso');
            res.redirect(`/documents/share/${documentId}`);
        } catch (error) {
            console.error('Share error:', error);
            req.flash('error', error.message || 'Erro ao compartilhar documento');
            res.redirect(`/documents/share/${req.body.documentId}`);
        }
    },

    /**
     * Cria regra de liberação para documento
     */
    createRule: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect(`/documents/rules/${req.body.documentId}`);
        }

        try {
            const { documentId, ruleType, approvers, releaseDate } = req.body;
            
            const document = await Document.findById(documentId);
            if (document.usuario_id !== req.session.user.id) {
                req.flash('error', 'Acesso não autorizado');
                return res.redirect('/documents');
            }

            const rule = await ReleaseRule.create({
                documento_id: documentId,
                tipo_regra: ruleType,
                data_liberacao: ruleType === 'DATA' ? new Date(releaseDate) : null,
                status: 'PENDENTE'
            });

            // Adiciona aprovadores para regras que requerem aprovação
            if ((ruleType === 'ALGUNS' || ruleType === 'TODOS') && approvers) {
                const approversList = Array.isArray(approvers) ? approvers : [approvers];
                
                await Promise.all(
                    approversList.map(async cpf => {
                        await ReleaseRule.addApprover(rule.id, cpf);
                        
                        // Envia notificação para aprovadores
                        const approverUser = await User.findByCpf(cpf);
                        if (approverUser) {
                            await documentHelpers.sendNotification('approval_request', {
                                recipient: approverUser.email,
                                documentName: document.nome,
                                ruleId: rule.id
                            });
                        }
                    })
                );
            }

            req.flash('success', 'Regra criada com sucesso');
            res.redirect(`/documents/rules/${documentId}`);
        } catch (error) {
            console.error('CreateRule error:', error);
            req.flash('error', error.message || 'Erro ao criar regra');
            res.redirect(`/documents/rules/${req.body.documentId}`);
        }
    },

    /**
     * Download de documento com verificações de segurança
     */
    download: async (req, res) => {
        try {
            const { document, accessLevel } = await documentHelpers.checkDocumentAccess(
                req.session.user.id,
                req.session.user.cpf,
                req.params.id
            );

            // Verifica se documento está liberado por regras
            const isReleased = await documentHelpers.checkDocumentRules(document.id, req.session.user.cpf);
            if (!isReleased) {
                req.flash('error', 'Documento bloqueado por regras de liberação');
                return res.redirect('/documents');
            }

            const filePath = path.join(__dirname, '../public', document.caminho_arquivo);
            
            if (!fs.existsSync(filePath)) {
                req.flash('error', 'Arquivo não encontrado no servidor');
                return res.redirect('/documents');
            }

            // Define nome do arquivo removendo caracteres especiais
            const safeFileName = document.nome.replace(/[^a-zA-Z0-9._-]/g, '_');
            
            res.download(filePath, safeFileName);
        } catch (error) {
            console.error('Download error:', error);
            req.flash('error', error.message || 'Erro ao baixar arquivo');
            res.redirect('/documents');
        }
    },

    /**
     * Exibe formulário de compartilhamento
     */
    showShareForm: async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            if (!document || document.usuario_id !== req.session.user.id) {
                req.flash('error', 'Acesso não autorizado');
                return res.redirect('/documents');
            }

            const shares = await Share.findByDocument(req.params.id);
            const rules = await ReleaseRule.findByDocument(req.params.id);
            
            res.render('documents/share', {
                title: 'Compartilhar Documento',
                user: req.session.user,
                document,
                shares,
                rules,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (error) {
            console.error('ShowShareForm error:', error);
            req.flash('error', error.message || 'Erro ao carregar formulário');
            res.redirect('/documents');
        }
    },

    /**
     * Exibe formulário de regras de liberação
     */
    showRulesForm: async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            if (!document || document.usuario_id !== req.session.user.id) {
                req.flash('error', 'Acesso não autorizado');
                return res.redirect('/documents');
            }

            const rules = await ReleaseRule.findByDocument(req.params.id);
            const approvers = rules.length > 0 ? await ReleaseRule.getApprovers(rules[0].id) : [];
            
            res.render('documents/rules', {
                title: 'Regras de Liberação',
                user: req.session.user,
                document,
                rules,
                approvers,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (error) {
            console.error('ShowRulesForm error:', error);
            req.flash('error', error.message || 'Erro ao carregar formulário');
            res.redirect('/documents');
        }
    },

    /**
     * Mostra tela de aprovação
     */
    showApprovalForm: async (req, res) => {
        try {
            const rule = await ReleaseRule.findById(req.params.id);
            if (!rule) {
                req.flash('error', 'Regra de liberação não encontrada');
                return res.redirect('/documents');
            }

            const document = await Document.findById(rule.documento_id);
            const owner = await User.findById(document.usuario_id);
            const approvers = await ReleaseRule.getApprovers(rule.id);
            
            const isApprover = await ReleaseRule.isUserApprover(rule.id, req.session.user.cpf);
            if (!isApprover) {
                req.flash('error', 'Você não tem permissão para aprovar este documento');
                return res.redirect('/documents');
            }

            const userApproved = await ReleaseRule.hasUserApproved(rule.id, req.session.user.cpf);
            const approvedCount = approvers.filter(a => a.aprovado).length;
            const totalApprovers = approvers.length;

            res.render('documents/approval', {
                title: 'Aprovar Documento',
                user: req.session.user,
                document,
                rule,
                owner,
                approvers,
                userApproved,
                approvalProgress: {
                    approved: approvedCount,
                    total: totalApprovers,
                    percentage: Math.round((approvedCount / totalApprovers) * 100)
                }
            });
        } catch (error) {
            console.error('ShowApprovalForm error:', error);
            req.flash('error', error.message || 'Erro ao carregar formulário de aprovação');
            res.redirect('/documents');
        }
    },

    /**
     * Processa aprovação
     */
    approve: async (req, res) => {
        try {
            const { ruleId } = req.body;
            
            const isApprover = await ReleaseRule.isUserApprover(ruleId, req.session.user.cpf);
            if (!isApprover) {
                req.flash('error', 'Você não tem permissão para aprovar este documento');
                return res.redirect('/documents');
            }

            const hasApproved = await ReleaseRule.hasUserApproved(ruleId, req.session.user.cpf);
            if (hasApproved) {
                req.flash('info', 'Você já aprovou este documento');
                return res.redirect('/documents');
            }

            await ReleaseRule.approve(ruleId, req.session.user.cpf);
            
            // Verifica se todas as aprovações necessárias foram concluídas
            const rule = await ReleaseRule.findById(ruleId);
            const approvers = await ReleaseRule.getApprovers(ruleId);
            
            let allApproved = false;
            if (rule.tipo_regra === 'TODOS') {
                allApproved = approvers.every(a => a.aprovado);
            } else if (rule.tipo_regra === 'ALGUNS') {
                allApproved = approvers.filter(a => a.aprovado).length >= 1;
            }

            if (allApproved) {
                await ReleaseRule.updateStatus(ruleId, 'LIBERADO');
                
                // Notifica o dono do documento
                const document = await Document.findById(rule.documento_id);
                const owner = await User.findById(document.usuario_id);
                
                await documentHelpers.sendNotification('approval', {
                    recipient: owner.email,
                    documentName: document.nome,
                    documentId: document.id
                });
            }

            req.flash('success', allApproved 
                ? 'Documento liberado com todas as aprovações necessárias!' 
                : 'Sua aprovação foi registrada com sucesso');
                
            res.redirect('/documents');
        } catch (error) {
            console.error('Approve error:', error);
            req.flash('error', error.message || 'Erro ao processar aprovação');
            res.redirect('/documents');
        }
    }
};