// routes/pedidos.js
const express = require('express')
const router = express.Router()
const supabase = require('../supabase/client')
const { verificarToken } = require('../middleware/auth')

// Finalizar pedido
router.post('/finalizar', verificarToken, async (req, res) => {
  const { endereco_entrega, forma_pagamento } = req.body
  
  if (!endereco_entrega || !forma_pagamento) {
    return res.status(400).json({ error: 'Endereço e forma de pagamento são obrigatórios' })
  }
  
  try {
    // Buscar carrinho
    const { data: carrinho, error: cartError } = await supabase
      .from('carrinho')
      .select(`
        *,
        produto:produto_id (preco, nome, estoque)
      `)
      .eq('usuario_id', req.usuario.id)
    
    if (cartError || !carrinho.length) {
      return res.status(400).json({ error: 'Carrinho vazio' })
    }
    
    let total = carrinho.reduce((sum, item) => sum + (item.produto.preco * item.quantidade), 0)
    let desconto = 0
    
    if (forma_pagamento === 'pix') {
      desconto = total * 0.1
      total = total - desconto
    }
    
    // Gerar número do pedido
    const numeroPedido = `COP${Date.now()}${Math.floor(Math.random() * 1000)}`
    
    // Criar pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        numero: numeroPedido,
        usuario_id: req.usuario.id,
        total,
        endereco_entrega,
        forma_pagamento,
        status: 'confirmado'
      })
      .select()
      .single()
    
    if (pedidoError) throw pedidoError
    
    // Criar itens do pedido e atualizar estoque
    for (const item of carrinho) {
      const subtotal = item.produto.preco * item.quantidade
      
      await supabase
        .from('pedido_itens')
        .insert({
          pedido_id: pedido.id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.produto.preco,
          subtotal
        })
      
      // Atualizar estoque
      await supabase
        .from('produtos')
        .update({ estoque: item.produto.estoque - item.quantidade })
        .eq('id', item.produto_id)
    }
    
    // Limpar carrinho
    await supabase
      .from('carrinho')
      .delete()
      .eq('usuario_id', req.usuario.id)
    
    res.json({
      sucesso: true,
      pedido: {
        numero: pedido.numero,
        total,
        desconto_aplicado: desconto
      },
      mensagem: 'Pedido finalizado com sucesso!'
    })
    
  } catch (error) {
    console.error('Erro ao finalizar pedido:', error)
    res.status(500).json({ error: 'Erro ao finalizar pedido' })
  }
})

// Listar pedidos do usuário
router.get('/meus', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        itens:pedido_itens (
          *,
          produto:produto_id (nome, imagem_url)
        )
      `)
      .eq('usuario_id', req.usuario.id)
      .order('data_pedido', { ascending: false })
    
    if (error) throw error
    
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar pedidos' })
  }
})

module.exports = router