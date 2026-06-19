// =============================================================
// routes/categorias.js — Rotas de Categorias
// =============================================================
// O que são Rotas?
//   Rotas definem os "endereços" da nossa API e o que acontece
//   quando alguém acessa cada endereço.
//
// O que é um Router?
//   O express.Router() cria um mini-aplicativo Express com suas
//   próprias rotas. Assim mantemos o código organizado em arquivos
//   separados, em vez de colocar tudo no server.js.
//
// Prefixo de rotas:
//   No server.js, registramos este router em '/api/categorias'.
//   Então uma rota '/' aqui vira '/api/categorias' na URL final.
// =============================================================

const express = require('express');

// ─── Criação do Router ────────────────────────────────────────
// Router é um mini-servidor que gerencia apenas as rotas de categorias.
const router = express.Router();

// ─── Importação do Supabase ──────────────────────────────────
// Importamos o cliente do Supabase para acessar o banco de dados
const supabase = require('../supabase/client');
const { verificarToken } = require('../middleware/auth');

// =============================================================
// [GET] /api/categorias
// =============================================================
// Retorna a lista completa de categorias do cardápio.
//
// Teste no Thunder Client:
//   Método: GET
//   URL: http://localhost:3000/api/categorias
//
// Resposta esperada:
//   [ 
//     { "id": 1, "nome": "Camisas", "descricao": null, "created_at": "2026-06-16..." },
//     { "id": 2, "nome": "Bonés", "descricao": null, "created_at": "2026-06-16..." },
//     { "id": 3, "nome": "Casacos", "descricao": null, "created_at": "2026-06-16..." }
//   ]
router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            throw error;
        }
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// =============================================================
// [GET] /api/categorias/:id
// =============================================================
// Retorna uma categoria específica pelo ID.
//
// Teste no Thunder Client:
//   Método: GET
//   URL: http://localhost:3000/api/categorias/1
//
// Resposta esperada:
//   { "id": 1, "nome": "Camisas", "descricao": null, "created_at": "2026-06-16..." }
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }
        
        if (!data) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// =============================================================
// [POST] /api/categorias
// =============================================================
// Cria uma nova categoria no cardápio.
// Requer autenticação (token de admin).
//
// Teste no Thunder Client:
//   Método: POST
//   URL: http://localhost:3000/api/categorias
//   Headers: { "Authorization": "Bearer {token}" }
//   Body (JSON): { "nome": "Acessórios", "descricao": "Cachecol, bolas e outros itens" }
//
// Resposta esperada (status 201 Created):
//   { "id": 4, "nome": "Acessórios", "descricao": "...", "created_at": "2026-06-16..." }
router.post('/', verificarToken, async (req, res, next) => {
    try {
        const { nome, descricao } = req.body;
        
        if (!nome) {
            return res.status(400).json({ error: 'O campo nome é obrigatório' });
        }
        
        const { data, error } = await supabase
            .from('categorias')
            .insert([{ 
                nome: nome,
                descricao: descricao || null
            }])
            .select();

        if (error) throw error;

        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
});

// =============================================================
// [PUT] /api/categorias/:id
// =============================================================
// Atualiza uma categoria existente.
// Requer autenticação (token de admin).
//
// Teste no Thunder Client:
//   Método: PUT
//   URL: http://localhost:3000/api/categorias/1
//   Headers: { "Authorization": "Bearer {token}" }
//   Body (JSON): { "nome": "Camisas Oficiais", "descricao": "Camisas de seleções" }
router.put('/:id', verificarToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nome, descricao } = req.body;
        
        if (!nome) {
            return res.status(400).json({ error: 'O campo nome é obrigatório' });
        }
        
        // Verificar se a categoria existe
        const { data: existente, error: findError } = await supabase
            .from('categorias')
            .select('id')
            .eq('id', id)
            .single();
        
        if (findError || !existente) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        const { data, error } = await supabase
            .from('categorias')
            .update({ 
                nome: nome,
                descricao: descricao || null
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json(data[0]);
    } catch (err) {
        next(err);
    }
});

// =============================================================
// [DELETE] /api/categorias/:id
// =============================================================
// Remove uma categoria.
// Requer autenticação (token de admin).
//
// ATENÇÃO: Só é possível deletar se NENHUM produto estiver usando esta categoria.
//
// Teste no Thunder Client:
//   Método: DELETE
//   URL: http://localhost:3000/api/categorias/4
//   Headers: { "Authorization": "Bearer {token}" }
router.delete('/:id', verificarToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Verificar se a categoria existe
        const { data: existente, error: findError } = await supabase
            .from('categorias')
            .select('id')
            .eq('id', id)
            .single();
        
        if (findError || !existente) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        // Verificar se há produtos usando esta categoria
        const { data: produtosComCategoria, error: produtosError } = await supabase
            .from('produtos')
            .select('id, nome')
            .eq('categoria', existente.nome)
            .limit(1);
        
        if (produtosComCategoria && produtosComCategoria.length > 0) {
            return res.status(400).json({ 
                error: `Não é possível deletar a categoria "${existente.nome}" porque existem produtos usando ela.` 
            });
        }
        
        const { error } = await supabase
            .from('categorias')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ 
            sucesso: true, 
            mensagem: `Categoria "${existente.nome}" removida com sucesso` 
        });
    } catch (err) {
        next(err);
    }
});

// =============================================================
// [GET] /api/categorias/com-produtos
// =============================================================
// Retorna categorias com a contagem de produtos em cada uma.
//
// Teste no Thunder Client:
//   Método: GET
//   URL: http://localhost:3000/api/categorias/com-produtos
//
// Resposta esperada:
//   [
//     { "id": 1, "nome": "Camisas", "descricao": null, "total_produtos": 6 },
//     { "id": 2, "nome": "Bonés", "descricao": null, "total_produtos": 1 },
//     { "id": 3, "nome": "Casacos", "descricao": null, "total_produtos": 1 }
//   ]
router.get('/com-produtos', async (req, res, next) => {
    try {
        // Buscar todas as categorias
        const { data: categorias, error: catError } = await supabase
            .from('categorias')
            .select('*')
            .order('id', { ascending: true });
        
        if (catError) throw catError;
        
        // Para cada categoria, contar produtos
        const resultado = await Promise.all(categorias.map(async (categoria) => {
            const { count, error } = await supabase
                .from('produtos')
                .select('id', { count: 'exact', head: true })
                .eq('categoria', categoria.nome)
                .eq('ativo', true);
            
            return {
                ...categoria,
                total_produtos: count || 0
            };
        }));
        
        res.json(resultado);
    } catch (err) {
        next(err);
    }
});

// ─── Exportação do Router ─────────────────────────────────────
// Exportamos o router para ser usado no server.js
module.exports = router;