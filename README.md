# To-do List Inteligente

Gestor de tarefas multiusuário com autenticação, banco de dados na nuvem, painel administrativo e funcionamento offline.

##  Objetivo

Este projeto nasceu de uma necessidade minha: um gestor de tarefas simples que funcionasse do meu jeito. A primeira versão usava apenas DOM e localStorage. Conforme o uso diário revelou limitações, evoluí para uma aplicação multiusuário completa: autenticação e banco Postgres via Supabase, isolamento de dados por usuário com Row Level Security, painel administrativo com métricas e funcionamento offline como PWA.

É também um retrato do meu processo de trabalho: começar pelo problema real, lançar o mínimo funcional e evoluir a arquitetura quando o uso justifica.

##  Funcionalidades

- **Multiusuário** — cada pessoa cria sua conta e vê apenas suas próprias tarefas
- **Autenticação** — cadastro e login via Supabase Auth
- **Dados na nuvem** — tarefas persistidas em Postgres, acessíveis de qualquer dispositivo
- **Segurança por padrão** — isolamento de dados com Row Level Security (RLS) no banco
- **Painel administrativo** — métricas de uso e gestão de usuários
- **PWA** — instalável e funcional offline

## 🛠️ Stack

- HTML, CSS e JavaScript
- [Supabase](https://supabase.com) — Postgres, Auth e Row Level Security
- PWA (Service Worker para funcionamento offline)

##  Como rodar seu próprio

1. Clone o repositório:
   ```bash
   git clone https://github.com/DiogoFaleiro/to-do-list-inteligente.git
   ```
2. Crie um projeto gratuito no [Supabase](https://supabase.com)
3. Execute as migrations da pasta `migrations/` no SQL Editor do Supabase, em ordem
4. Configure sua URL e anon key do Supabase em `js/supabaseClient.js`:
   ```javascript
   const SUPABASE_URL = "SUA_URL_AQUI";
   const SUPABASE_ANON_KEY = "SUA_ANON_KEY_AQUI";
   ```
5. Abra o `index.html` no navegador ou publique em qualquer hospedagem estática

> 🔒 **Nota de segurança:** a anon key do Supabase é pública por design, mas a proteção real dos dados vem das políticas de RLS aplicadas nas migrations. Não remova nem afrouxe essas políticas.

## 📄 Licença

Distribuído sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## Autor

**Diogo Faleiro** — Fundador da DFsystem Soluções Empresariais
Automação e Agentes de IA para pequenas empresas

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/dfaleiro/)
