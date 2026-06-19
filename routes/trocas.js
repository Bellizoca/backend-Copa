// routes/trocas.js
const express = require('express')
const router = express.Router()
const supabase = require('../supabase/client')
const { verificarToken } = require('../middleware/auth')

// Criar proposta de troca
router.post('/', verificarToken, async (req, res) => {
  const { item_oferecido_id, item_desejado_id, mensagem } = req.body
  
  if (!item_oferecido_id || !item_desejado_id) {
    return res.status(400).json({ error: 'Itens são obrigatórios' })
  }
  
  try {
    // Verificar se o item oferecido pertence ao usuário
    const { data: meuItem, error: findError } = await supabase
      .from('produtos')
      .select('usuario_id')
      .eq('id', item_oferecido_id)
      .single()
    
    if (findError || !meuItem) {
      return res.status(404).json({ error: 'Item não encontrado' })
    }
    
    if (meuItem.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'Você só pode oferecer seus próprios itens' })
    }
    
    const { data, error } = await supabase
      .from('propostas_troca')
      .insert({
        solicitante_id: req.usuario.id,
        item_oferecido_id,
        item_desejado_id,
        mensagem: mensagem || null,
        status: 'pendente'
      })
      .select()
      .single()
    
    if (error) throw error
    
    res.status(201).json({ sucesso: true, proposta: data })
  } catch (error) {
    console.error('Erro ao criar proposta:', error)
    res.status(500).json({ error: 'Erro ao criar proposta de troca' })
  }
})

// Listar propostas do usuário
router.get('/minhas', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('propostas_troca')
      .select(`
        *,
        item_oferecido:item_oferecido_id (id, nome, preco, imagem_url),
        item_desejado:item_desejado_id (id, nome, preco, imagem_url, usuario_id)
      `)
      .or(`solicitante_id.eq.${req.usuario.id},item_desejado_id.usuario_id.eq.${req.usuario.id}`)
      .order('data_proposta', { ascending: false })
    
    if (error) throw error
    
    res.json(data || [])
  } catch (error) {
    console.error('Erro ao carregar propostas:', error)
    res.status(500).json({ error: 'Erro ao carregar propostas' })
  }
})

// Responder proposta
router.put('/:id/responder', verificarToken, async (req, res) => {
  const { id } = req.params
  const { aceitar } = req.body
  
  try {
    // Buscar proposta com os itens
    const { data: proposta, error: findError } = await supabase
      .from('propostas_troca')
      .select(`
        *,
        item_desejado:item_desejado_id (usuario_id)
      `)
      .eq('id', id)
      .single()
    
    if (findError || !proposta) {
      return res.status(404).json({ error: 'Proposta não encontrada' })
    }
    
    // Verificar se o usuário atual é o dono do item desejado
    if (proposta.item_desejado.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'Você não tem permissão para responder esta proposta' })
    }
    
    const status = aceitar ? 'aceita' : 'recusada'
    
    const { error: updateError } = await supabase
      .from('propostas_troca')
      .update({ status })
      .eq('id', id)
    
    if (updateError) throw updateError
    
    // Se aceitar, trocar os donos dos itens
    if (aceitar) {
      // Trocar o dono do item desejado para o solicitante
      await supabase
        .from('produtos')
        .update({ usuario_id: proposta.solicitante_id })
        .eq('id', proposta.item_desejado_id)
      
      // Trocar o dono do item oferecido para o atual usuário
      await supabase
        .from('produtos')
        .update({ usuario_id: req.usuario.id })
        .eq('id', proposta.item_oferecido_id)
    }
    
    res.json({ sucesso: true, mensagem: `Proposta ${aceitar ? 'aceita' : 'recusada'}` })
  } catch (error) {
    console.error('Erro ao responder proposta:', error)
    res.status(500).json({ error: 'Erro ao responder proposta' })
  }
})
module.exports = router