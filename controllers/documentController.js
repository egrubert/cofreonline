const Document = require('../models/Document');
const Share = require('../models/Share');
const ReleaseRule = require('../models/ReleaseRule');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');



/**
 * Cria regra familiar para documentos compartilhados com múltiplos usuários
 * @param {number} documentId - ID do documento
 * @param {string[]} childrenCPFs - Array de CPFs dos usuários que devem aprovar
 */
const createFamilyRule = async (documentId, childrenCPFs) => {
    try {
        // Validação básica dos CPFs
        if (!Array.isArray(childrenCPFs) || childrenCPFs.length === 0) {
            throw new Error('Lista de CPFs inválida');
        }

        const rule = await ReleaseRule.create({
            documento_id: documentId,
            tipo_regra: 'TODOS',
            status: 'PENDENTE'
        });

        // Processamento em paralelo para melhor performance
        await Promise.all(
            childrenCPFs.map(cpf => ReleaseRule.addApprover(rule.id, cpf))
        );

        return rule;
    } catch (error) {
        console.error('Erro ao criar regra familiar:', error);
        throw error;
    }
};

module.exports = {


    /**
     * Processa aprovação do documento
     */
    approve: async (req, res) => {
        try {
            const { ruleId } = req.body;
            
            await ReleaseRule.approve(ruleId, req.session.user.cpf);
            
            const allApproved = await ReleaseRule.checkAllApproved(ruleId);
            
            if (allApproved) {
                await ReleaseRule.updateStatus(ruleId, 'LIBERADO');
                // Adicione notificação por e-mail aqui se necessário
            }

            req.flash('success', allApproved 
                ? 'Documento liberado com sucesso!' 
                : 'Sua aprovação foi registrada');
            res.redirect('/documents');
        } catch (error) {
            console.error('Approve error:', error);
            req.flash('error', 'Erro no processo de aprovação');
            res.redirect('/documents');
        }
    },
     /**
     * Mostra formulário de aprovação
     */
    showApprovalForm: async (req, res) => {
        try {
            const rule = await ReleaseRule.findById(req.params.id);
            const document = await Document.findById(rule.documento_id);
            const owner = await User.findById(document.usuario_id);
            
            res.render('documents/approval', {
                document,
                rule,
                owner,
                user: req.session.user
            });
        } catch (error) {
            console.error(error);
            req.flash('error', 'Erro ao carregar aprovação');
            res.redirect('/documents');
        }
    },
    

    /**
     * Lista documentos do usuário e compartilhados com ele
     */
    list: async (req, res) => {
        try {
            const [myDocuments, sharedWithMe] = await Promise.all([
                Document.findByUser(req.session.user.id),
                Share.findByUser(req.session.user.cpf)
            ]);
            
            res.render('documents/list', {
                title: 'Meus Documentos',
                user: req.session.user,
                myDocuments,
                sharedWithMe,
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
     * Upload de documento com validações
     */
    upload: async (req, res) => {
        try {
            // Verifique se o arquivo foi recebido
            if (!req.file) {
                req.flash('error', 'Nenhum arquivo foi enviado');
                return res.redirect('/documents');
            }

            const file = req.file; // Agora usando req.file em vez de req.files.document
            
            // Verifique se o upload foi bem-sucedido
            if (!file.path) {
                req.flash('error', 'Erro no processamento do arquivo');
                return res.redirect('/documents');
            }

            const document = await Document.create({
                nome: req.body.name || file.originalname,
                caminho_arquivo: `/uploads/${file.filename}`,
                tamanho: file.size,
                tipo: file.mimetype,
                usuario_id: req.session.user.id
            });

            req.flash('success', 'Documento enviado com sucesso!');
            res.redirect('/documents');
        } catch (error) {
            console.error('Upload error:', error);
            req.flash('error', 'Falha no upload do documento');
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
            
            // Verifica se o documento pertence ao usuário
            const document = await Document.findById(documentId);
            if (document.usuario_id !== req.session.user.id) {
                req.flash('error', 'Acesso não autorizado');
                return res.redirect('/documents');
            }

            // Cria compartilhamento
            await Share.create({
                documento_id: documentId,
                cpf_destinatario: cpf,
                pode_visualizar: canView === 'on',
                pode_baixar: canDownload === 'on'
            });

            // Se for compartilhamento familiar, cria regra
            if (childrenCPFs && childrenCPFs.length > 0) {
                await createFamilyRule(documentId, childrenCPFs.split(','));
            }

            req.flash('success', 'Documento compartilhado com sucesso');
            res.redirect(`/documents/share/${documentId}`);
        } catch (error) {
            console.error('Share error:', error);
            req.flash('error', 'Erro ao compartilhar documento');
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
            
            // Verifica se o documento pertence ao usuário
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

            // Adicionar aprovadores se necessário
            if ((ruleType === 'ALGUNS' || ruleType === 'TODOS') && approvers) {
                const approversList = Array.isArray(approvers) ? approvers : [approvers];
                await Promise.all(
                    approversList.map(cpf => ReleaseRule.addApprover(rule.id, cpf))
                );
            }

            req.flash('success', 'Regra criada com sucesso');
            res.redirect(`/documents/rules/${documentId}`);
        } catch (error) {
            console.error('CreateRule error:', error);
            req.flash('error', 'Erro ao criar regra');
            res.redirect(`/documents/rules/${req.body.documentId}`);
        }
    },

    /**
     * Aprova liberação de documento
     */
    approve: async (req, res) => {
        try {
            const { ruleId } = req.body;
            
            await ReleaseRule.approve(ruleId, req.session.user.cpf);
            
            // Verifica se todas as aprovações foram concluídas
            const allApproved = await ReleaseRule.checkAllApproved(ruleId);
            
            if (allApproved) {
                await ReleaseRule.updateStatus(ruleId, 'LIBERADO');
                req.flash('success', 'Documento liberado com sucesso');
            } else {
                req.flash('success', 'Sua aprovação foi registrada');
            }

            res.redirect('/documents');
        } catch (error) {
            console.error('Approve error:', error);
            req.flash('error', 'Erro ao aprovar liberação');
            res.redirect('/documents');
        }
    },

    /**
     * Download de documento com verificações de segurança
     */
    download2: async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            if (!document) {
                req.flash('error', 'Documento não encontrado');
                return res.redirect('/documents');
            }

            // Verifica permissões
            const isOwner = document.usuario_id === req.session.user.id;
            const canDownload = isOwner || 
                await Share.checkPermission(document.id, req.session.user.cpf, 'download');

            if (!canDownload) {
                req.flash('error', 'Acesso não autorizado');
                return res.redirect('/documents');
            }

            // Verifica regras de liberação
            const rules = await ReleaseRule.findByDocument(document.id);
            const isBlocked = rules.some(rule => rule.status !== 'LIBERADO');
            
            if (rules.length > 0 && isBlocked) {
                req.flash('error', 'Documento bloqueado por regras de liberação');
                return res.redirect('/documents');
            }

            const filePath = path.join(__dirname, '../public', document.caminho_arquivo);
            
            if (!fs.existsSync(filePath)) {
                req.flash('error', 'Arquivo não encontrado no servidor');
                return res.redirect('/documents');
            }

            res.download(filePath, document.nome);
        } catch (error) {
            console.error('Download error:', error);
            req.flash('error', 'Erro ao baixar arquivo');
            res.redirect('/documents');
        }
    },
            download: async (req, res) => {
                try {
                    const document = await Document.findById(req.params.id);
                    if (!document) {
                        req.flash('error', 'Documento não encontrado');
                        return res.redirect('/documents');
                    }

                    // Verifica permissões básicas
                    const isOwner = document.usuario_id === req.session.user.id;
                    const sharedWithMe = await Share.findByUser(req.session.user.cpf);
                    const canAccess = sharedWithMe.some(s => s.documento_id === document.id);

                    if (!isOwner && !canAccess) {
                        req.flash('error', 'Acesso não autorizado');
                        return res.redirect('/documents');
                    }

                    // Verifica regras de liberação
                    // Verifica regras de liberação
                const rules = await ReleaseRule.findByDocument(document.id);
                if (rules.length > 0) {
                    const allRulesApproved = await Promise.all(rules.map(async (rule) => {
                        // Se já está liberado, não precisa verificar mais
                        if (rule.status === 'LIBERADO') return true;
                        
                        // Verifica se o usuário atual é um aprovador pendente
                        const isApprover = await ReleaseRule.isUserApprover(rule.id, req.session.user.cpf);
                        const needsMyApproval = isApprover && 
                                            (rule.tipo_regra === 'TODOS' || 
                                            rule.tipo_regra === 'ALGUNS');
                        
                        // Se precisa da minha aprovação e eu não aprovei ainda
                        if (needsMyApproval) {
                            const hasApproved = await ReleaseRule.hasUserApproved(rule.id, req.session.user.cpf);
                            return hasApproved;
                        }
                        
                        return true;
                    }));
                    
                    // Se alguma regra não foi aprovada
                    if (allRulesApproved.includes(false)) {
                        req.flash('error', 'Documento bloqueado - existem regras de liberação pendentes');
                        return res.redirect('/documents');
                    }
                }
                    
                    //-----------------------------------------------------------------------------------

                const filePath = path.join(__dirname, '../public', document.caminho_arquivo);
                    res.download(filePath, document.nome);
                } catch (error) {
                    console.error('Download error:', error);
                    req.flash('error', 'Erro ao baixar arquivo');
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
            
            res.render('documents/share', {
                title: 'Compartilhar Documento',
                user: req.session.user,
                document,
                shares,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (error) {
            console.error('ShowShareForm error:', error);
            req.flash('error', 'Erro ao carregar formulário');
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
            
            res.render('documents/rules', {
                title: 'Regras de Liberação',
                user: req.session.user,
                document,
                rules,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (error) {
            console.error('ShowRulesForm error:', error);
            req.flash('error', 'Erro ao carregar formulário');
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
            
            // Verifica se o usuário atual é um aprovador
            const isApprover = await ReleaseRule.isUserApprover(rule.id, req.session.user.cpf);
            if (!isApprover) {
                req.flash('error', 'Você não tem permissão para aprovar este documento');
                return res.redirect('/documents');
            }

            res.render('documents/approval', {
                title: 'Aprovar Documento',
                user: req.session.user,
                document,
                rule,
                owner
            });
        } catch (error) {
            console.error('ShowApprovalForm error:', error);
            req.flash('error', 'Erro ao carregar formulário de aprovação');
            res.redirect('/documents');
        }
    },

    /**
     * Processa aprovação
     */
    approve: async (req, res) => {
        try {
            const { ruleId } = req.body;
            
            // Verifica se o usuário é um aprovador válido
            const isApprover = await ReleaseRule.isUserApprover(ruleId, req.session.user.cpf);
            if (!isApprover) {
                req.flash('error', 'Você não tem permissão para aprovar este documento');
                return res.redirect('/documents');
            }

            // Registra aprovação
            await ReleaseRule.approve(ruleId, req.session.user.cpf);
            
            // Verifica se todas as aprovações foram concluídas
            const allApproved = await ReleaseRule.checkAllApproved(ruleId);
            
            if (allApproved) {
                await ReleaseRule.updateStatus(ruleId, 'LIBERADO');
                
                // Aqui você pode adicionar notificação por e-mail
                // await sendApprovalNotification(ruleId);
            }

            req.flash('success', allApproved 
                ? 'Documento liberado com sucesso!' 
                : 'Sua aprovação foi registrada');
            res.redirect('/documents');
        } catch (error) {
            console.error('Approve error:', error);
            req.flash('error', 'Erro ao processar aprovação');
            res.redirect('/documents');
        }
    }
};