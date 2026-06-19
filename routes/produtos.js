// routes/produtos.js
const express = require('express')
const router = express.Router()
const supabase = require('../supabase/client')
const { verificarToken } = require('../middleware/auth')

// Listar todos os produtos ativos
router.get('/', async (req, res) => {
  const { categoria, selecao, preco_min, preco_max, ordenar } = req.query
  
  try {
    let query = supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
    
    if (categoria) query = query.eq('categoria', categoria)
    if (selecao) query = query.eq('selecao', selecao)
    if (preco_min) query = query.gte('preco', parseFloat(preco_min))
    if (preco_max) query = query.lte('preco', parseFloat(preco_max))
    
    if (ordenar === 'preco_asc') query = query.order('preco', { ascending: true })
    else if (ordenar === 'preco_desc') query = query.order('preco', { ascending: false })
    else query = query.order('id', { ascending: true })
    
    const { data, error } = await query
    
    if (error) throw error
    
    res.json(data)
  } catch (error) {
    console.error('Erro ao listar produtos:', error)
    res.status(500).json({ error: 'Erro ao carregar produtos' })
  }
})

// Buscar produto por ID
// Listar produtos do usuário logado
router.get('/meus/anuncios', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('usuario_id', req.usuario.id)
      .order('data_criacao', { ascending: false })

    if (error) throw error

    res.json(data)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar seus anúncios' })
  }
})

// Buscar produto por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params
  
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    // Incrementar visualizações
    await supabase
      .from('produtos')
      .update({ visualizacoes: (data.visualizacoes || 0) + 1 })
      .eq('id', id)
    
    res.json(data)
  } catch (error) {
    res.status(404).json({ error: 'Produto não encontrado' })
  }
})

// Criar novo produto (requer login)
router.post('/', verificarToken, async (req, res) => {
  const { nome, categoria, preco, estoque, imagem_url, descricao, condicao, selecao, ano_copa, aceita_troca } = req.body
  
  if (!nome || !categoria || !preco) {
    return res.status(400).json({ error: 'Nome, categoria e preço são obrigatórios' })
  }
  
  try {
    const { data, error } = await supabase
      .from('produtos')
      .insert({
        nome,
        categoria,
        preco,
        estoque: estoque || 1,
        imagem_url: imagem_url || null,
        descricao: descricao || null,
        condicao: condicao || 'Bom estado',
        selecao: selecao || null,
        ano_copa: ano_copa || null,
        aceita_troca: aceita_troca !== undefined ? aceita_troca : true,
        usuario_id: req.usuario.id,
        ativo: true
      })
      .select()
      .single()
    
    if (error) throw error
    
    res.status(201).json({ sucesso: true, produto: data })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    res.status(500).json({ error: 'Erro ao criar produto' })
  }
})

// Atualizar produto (requer ser dono)
router.put('/:id', verificarToken, async (req, res) => {
  const { id } = req.params
  const updates = req.body
  
  try {
    // Verificar se o produto pertence ao usuário
    const { data: produto, error: findError } = await supabase
      .from('produtos')
      .select('usuario_id')
      .eq('id', id)
      .single()
    
    if (findError || !produto) {
      return res.status(404).json({ error: 'Produto não encontrado' })
    }
    
    if (produto.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'Você não tem permissão para editar este produto' })
    }
    
    const { data, error } = await supabase
      .from('produtos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    res.json({ sucesso: true, produto: data })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar produto' })
  }
})

// Deletar produto (soft delete - desativar)
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params
  
  try {
    const { data: produto } = await supabase
      .from('produtos')
      .select('usuario_id')
      .eq('id', id)
      .single()
    
    if (!produto || produto.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'Você não tem permissão para deletar este produto' })
    }
    
    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false })
      .eq('id', id)
    
    if (error) throw error
    
    res.json({ sucesso: true, mensagem: 'Produto removido com sucesso' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar produto' })
  }
})

module.exports = router