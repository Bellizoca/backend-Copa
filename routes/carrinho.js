// routes/carrinho.js
const express = require('express')
const router = express.Router()
const supabase = require('../supabase/client')
const { verificarToken } = require('../middleware/auth')

// Listar carrinho do usuário
router.get('/', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('carrinho')
      .select(`
        *,
        produto:produto_id (id, nome, preco, imagem_url, categoria, selecao, ano_copa)
      `)
      .eq('usuario_id', req.usuario.id)
    
    if (error) throw error
    
    const itens = data.map(item => ({
      id: item.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco,
      produtos: item.produto
    }))
    
    const total = itens.reduce((sum, item) => sum + (item.preco_unitario * item.quantidade), 0)
    const quantidadeTotal = itens.reduce((sum, item) => sum + item.quantidade, 0)
    
    res.json({ itens, total, quantidadeTotal, sucesso: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar carrinho' })
  }
})

// Adicionar item ao carrinho
router.post('/', verificarToken, async (req, res) => {
  const { produto_id, quantidade } = req.body
  
  if (!produto_id) {
    return res.status(400).json({ error: 'Produto ID é obrigatório' })
  }
  
  try {
    // Verificar se já existe
    const { data: existente } = await supabase
      .from('carrinho')
      .select('*')
      .eq('usuario_id', req.usuario.id)
      .eq('produto_id', produto_id)
      .single()
    
    if (existente) {
      const { error } = await supabase
        .from('carrinho')
        .update({ quantidade: existente.quantidade + (quantidade || 1) })
        .eq('id', existente.id)
      
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('carrinho')
        .insert({
          usuario_id: req.usuario.id,
          produto_id,
          quantidade: quantidade || 1
        })
      
      if (error) throw error
    }
    
    res.json({ sucesso: true, mensagem: 'Item adicionado ao carrinho' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar ao carrinho' })
  }
})

// Atualizar quantidade
router.put('/:id', verificarToken, async (req, res) => {
  const { id } = req.params
  const { quantidade } = req.body
  
  if (quantidade <= 0) {
    // Se quantidade for 0 ou negativa, remover
    return await supabase.from('carrinho').delete().eq('id', id).eq('usuario_id', req.usuario.id)
  }
  
  try {
    const { error } = await supabase
      .from('carrinho')
      .update({ quantidade })
      .eq('id', id)
      .eq('usuario_id', req.usuario.id)
    
    if (error) throw error
    
    res.json({ sucesso: true, mensagem: 'Quantidade atualizada' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar quantidade' })
  }
})

// Remover item do carrinho
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params
  
  try {
    const { error } = await supabase
      .from('carrinho')
      .delete()
      .eq('id', id)
      .eq('usuario_id', req.usuario.id)
    
    if (error) throw error
    
    res.json({ sucesso: true, mensagem: 'Item removido do carrinho' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover item' })
  }
})

module.exports = router