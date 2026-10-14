# 🎧 Helpdesk System

Sistema web de **abertura e acompanhamento de chamados de suporte de TI**, com autenticação JWT, perfis de acesso, histórico de interações e envio de anexos.

Nasceu da minha rotina como Analista de Suporte N1: a ideia é organizar o ciclo de vida de um chamado, da abertura até a resolução, em uma aplicação full-stack.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=flat&logo=sequelize&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=flat&logo=mariadb&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

---

## ✨ Funcionalidades

- **Cadastro e login** com senha criptografada (bcrypt) e token **JWT**
- **Perfis de acesso** (`comum`, `suporte`, `admin`) com middleware de permissão por rota
- **Abertura de chamados** com título e descrição
- **Fluxo de status**: `aberto` → `em andamento` → `resolvido`
- **Interações** (mensagens) no histórico de cada chamado
- **Anexos** (imagens e PDF, até 10 MB) com upload via Multer
- **Rotas protegidas** no frontend e notificações com React Hot Toast

## 🏗️ Arquitetura

```
Helpdesk-System/
├── backend/                 # API REST (Node.js + Express)
│   ├── index.js             # Ponto de entrada
│   └── src/
│       ├── config/          # Banco de dados e upload (Multer)
│       ├── controllers/     # Auth, Chamado, Interação, Anexo, Usuário
│       ├── database/        # Conexão e migrations (Sequelize)
│       ├── middleware/      # Autenticação JWT e permissões
│       ├── models/          # Usuario, Chamado, Interacao, Anexo
│       └── routes.js
├── frontend/                # SPA (React + Vite + Tailwind)
│   └── src/
│       ├── pages/           # Login, Register, Dashboard, ChamadoDetalhe
│       ├── components/      # ProtectedRoute
│       └── services/api.js  # Axios com interceptor de token
└── docker-compose.yml       # MariaDB para desenvolvimento
```

**Modelo de dados:** um `Usuario` tem vários `Chamados`; cada `Chamado` tem várias `Interacoes` e vários `Anexos`.

## 🔌 Endpoints principais

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| POST | `/api/register` | Cria usuário | Público |
| POST | `/api/login` | Autentica e retorna o token | Público |
| GET | `/api/chamados` | Lista os chamados do usuário | Autenticado |
| POST | `/api/chamados` | Abre um chamado | Autenticado |
| GET | `/api/chamados/:id` | Detalhes, interações e anexos | Autenticado |
| PUT | `/api/chamados/:id/status` | Atualiza o status | Autenticado |
| POST | `/api/chamados/:id/interacoes` | Adiciona uma mensagem | Autenticado |
| POST | `/api/chamados/:id/anexos` | Envia um anexo | Dono do chamado |
| GET | `/api/usuarios` | Lista usuários | Admin |

## 🚀 Como rodar localmente

**Pré-requisitos:** Node.js 18+ e Docker Desktop (aberto).

### 1. Banco de dados

Na raiz do projeto:

```bash
docker compose up -d
```

Sobe um MariaDB 10.11 em `localhost:3306`, já com o banco `helpdesk_db` e o usuário `helpdesk_user` criados.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # no Windows (cmd): copy .env.example .env
npm run db:migrate        # cria as tabelas
npm run db:seed           # cria usuários e chamados de exemplo
npm run dev               # API em http://localhost:3000/api
```

O `.env.example` já vem com as credenciais do `docker-compose.yml`. Troque só o `JWT_SECRET`.

### 3. Frontend (em outro terminal)

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

### Usuários de teste

Criados pelo `npm run db:seed`. A senha de todos é `123456`.

| Perfil | E-mail |
|---|---|
| admin | `admin@helpdesk.com` |
| suporte | `suporte@helpdesk.com` |
| comum | `usuario@helpdesk.com` |

### Comandos úteis (backend)

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia a API com recarga automática |
| `npm run db:migrate` | Aplica as migrations pendentes |
| `npm run db:seed` | Insere os dados de exemplo |
| `npm run db:reset` | Apaga tudo, recria as tabelas e insere os dados de exemplo |

Para zerar o banco por completo, incluindo o volume do Docker: `docker compose down -v`.

### Problemas comuns

- **`ECONNREFUSED` ou `Access denied` ao rodar migrations:** o container do banco não está de pé, ou a senha do `.env` não bate com a do `docker-compose.yml`. Confira com `docker compose ps`.
- **Porta 3306 em uso:** já existe um MySQL/MariaDB instalado na máquina. Pare esse serviço ou troque a porta no compose (ex.: `"3307:3306"`) e no `DB_PORT` do `.env`.
- **`Foreign key constraint is incorrectly formed`:** acontecia em versões antigas do projeto, que não tinham a migration de `usuarios`. Atualize o código e rode `npm run db:reset`.

## 🗺️ Próximos passos

- [ ] Fila de chamados para o perfil `suporte`, com atribuição de responsável
- [ ] Restringir ao admin a definição de perfis de usuário
- [ ] Controle de acesso por perfil no detalhe do chamado
- [ ] Prioridade e SLA por chamado
- [ ] Testes automatizados da API
- [ ] Deploy (Railway)

---

Desenvolvido por **[Jolivan Abreu](https://www.linkedin.com/in/jolivan-abreu-teixeira-5a27961b0)**.
