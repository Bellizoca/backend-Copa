// server.js
const express = require('express')
const cors = require('cors')
require('dotenv').config()

// Importação das rotas
const authRoutes = require('./routes/auth')
const produtoRoutes = require('./routes/produtos')
const carrinhoRoutes = require('./routes/carrinho')
const pedidoRoutes = require('./routes/pedidos')
const trocaRoutes = require('./routes/trocas')
const categoriaRoutes = require('./routes/categorias')  // <-- NOVA ROTA

const app = express()
const PORT = process.env.PORT || 3000

// ============================================
// MIDDLEWARES
// ============================================

// CORS - Permitir requisições do frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Parse JSON
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Log de requisições (para debug)
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`)
  next()
})

// ============================================
// ROTAS
// ============================================

// Rotas de autenticação
app.use('/api/auth', authRoutes)

// Rotas de produtos
app.use('/api/produtos', produtoRoutes)

// Rotas de carrinho
app.use('/api/carrinho', carrinhoRoutes)

// Rotas de pedidos
app.use('/api/pedidos', pedidoRoutes)

// Rotas de trocas
app.use('/api/trocas', trocaRoutes)

// Rotas de categorias  <-- NOVA ROTA ADICIONADA
app.use('/api/categorias', categoriaRoutes)

// ============================================
// ROTA PRINCIPAL (teste)
// ============================================

app.get('/', (req, res) => {
  res.json({ 
    mensagem: '🏆 Mercado da Copa API', 
    versao: '1.0.0',
    endpoints: {
      autenticacao: {
        registro: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        perfil: 'GET /api/auth/perfil'
      },
      produtos: {
        listar: 'GET /api/produtos',
        detalhe: 'GET /api/produtos/:id',
        criar: 'POST /api/produtos',
        editar: 'PUT /api/produtos/:id',
        deletar: 'DELETE /api/produtos/:id',
        meus_anuncios: 'GET /api/produtos/meus/anuncios'
      },
      categorias: {  // <-- NOVO ENDPOINT
        listar: 'GET /api/categorias',
        detalhe: 'GET /api/categorias/:id',
        criar: 'POST /api/categorias',
        editar: 'PUT /api/categorias/:id',
        deletar: 'DELETE /api/categorias/:id',
        com_produtos: 'GET /api/categorias/com-produtos'
      },
      carrinho: {
        ver: 'GET /api/carrinho',
        adicionar: 'POST /api/carrinho',
        atualizar: 'PUT /api/carrinho/:id',
        remover: 'DELETE /api/carrinho/:id'
      },
      pedidos: {
        finalizar: 'POST /api/pedidos/finalizar',
        meus_pedidos: 'GET /api/pedidos/meus'
      },
      trocas: {
        criar: 'POST /api/trocas',
        minhas_propostas: 'GET /api/trocas/minhas',
        responder: 'PUT /api/trocas/:id/responder'
      }
    }
  })
})

// Rota de health check (para monitoramento)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// ============================================
// TRATAMENTO DE ERROS (404 - Rota não encontrada)
// ============================================

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    mensagem: `A rota ${req.method} ${req.url} não existe`,
    sugestao: 'Verifique os endpoints disponíveis em GET /'
  })
})

// ============================================
// TRATAMENTO DE ERROS GLOBAIS
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Erro:', err.stack)
  
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    mensagem: 'Algo deu errado. Tente novamente mais tarde.'
  })
})

// ============================================
// INICIAR O SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log('')
  console.log('=' .repeat(50))
  console.log('🏆 MERCADO DA COPA - BACKEND')
  console.log('=' .repeat(50))
  console.log(`🚀 Servidor rodando na porta: ${PORT}`)
  console.log(`📍 Local: http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  console.log('=' .repeat(50))
  console.log('✅ Backend pronto para receber requisições!')
  console.log('')
  console.log('📌 Endpoints disponíveis:')
  console.log(`   GET  /api/categorias        - Listar categorias`)
  console.log(`   POST /api/categorias        - Criar categoria`)
  console.log(`   GET  /api/categorias/:id    - Detalhe da categoria`)
  console.log(`   PUT  /api/categorias/:id    - Editar categoria`)
  console.log(`   DELETE /api/categorias/:id  - Deletar categoria`)
  console.log(`   GET  /api/categorias/com-produtos - Categorias com contagem`)
  console.log('')
})