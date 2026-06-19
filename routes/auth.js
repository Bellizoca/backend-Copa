// routes/auth.js
const express = require('express')
const router = express.Router()
const supabase = require('../supabase/client')

// Registrar novo usuário
router.post('/register', async (req, res) => {
  const { email, senha, nome, telefone } = req.body
  
  if (!email || !senha || !nome) {
    return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' })
  }
  
  try {
    // Criar usuário no auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, telefone } }
    })
    
    if (authError) throw authError
    
    // Criar perfil
    const { error: perfilError } = await supabase
      .from('perfis')
      .insert({
        id: authData.user.id,
        nome,
        email,
        telefone: telefone || null,
        tipo: 'cliente'
      })
    
    if (perfilError) throw perfilError
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Conta criada com sucesso',
      usuario: { id: authData.user.id, email, nome }
    })
    
  } catch (error) {
    console.error('Erro no registro:', error)
    res.status(500).json({ error: error.message || 'Erro ao criar conta' })
  }
})

// Login de usuário
router.post('/login', async (req, res) => {
  const { email, senha } = req.body
  
  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' })
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    })
    
    if (error) throw error
    
    // Buscar perfil
    const { data: perfil } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    res.json({
      sucesso: true,
      token: data.session.access_token,
      usuario: {
        id: data.user.id,
        email: data.user.email,
        nome: perfil?.nome,
        tipo: perfil?.tipo
      }
    })
    
  } catch (error) {
    console.error('Erro no login:', error)
    res.status(401).json({ error: 'Email ou senha inválidos' })
  }
})

// Buscar perfil do usuário logado
router.get('/perfil', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) throw error
    
    const { data: perfil } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', user.id)
      .single()
    
    res.json({ usuario: user, perfil })
    
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' })
  }
})

module.exports = router