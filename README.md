# Promo Eye

Aplicação web desenvolvida para gerenciamento e visualização de promoções e ofertas. O projeto utiliza tecnologias modernas para oferecer uma experiência de usuário responsiva e eficiente.

## Tecnologias Utilizadas

- **Vite** - Ferramenta de build rápida com hot reload
- **TypeScript** - Superset do JavaScript com tipagem estática
- **React** - Biblioteca JavaScript para construção de interfaces de usuário
- **Tailwind CSS** - Framework CSS utilitário para estilização rápida
- **shadcn/ui** - Coleção de componentes acessíveis e customizáveis
- **Supabase** - Banco de dados e autenticação como serviço
- **TanStack Query** - Gerenciamento de estado assíncrono e caching

## Pré-requisitos

Antes de começar, você precisará ter instalado:

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Bun](https://bun.sh/) (alternativa ao npm/yarn)

## Instalação e Execução

Siga os passos abaixo para rodar o projeto localmente:

### 1. Clone o repositório:

```bash
git clone <URL_DO_REPOSITORIO>
cd promo-eye-app
```

### 2. Instale as dependências:

```bash
bun install
```

### 3. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_SUPABASE_URL="sua_url_supabase_aqui"
VITE_SUPABASE_PROJECT_ID="seu_project_id_aqui"
VITE_SUPABASE_PUBLISHABLE_KEY="sua_chave_publica_aqui"
```

### 4. Inicie o servidor de desenvolvimento:

```bash
bun run dev
```

A aplicação estará disponível em `http://localhost:5173` (ou outra porta exibida no terminal).

## Scripts Disponíveis

No diretório do projeto, você pode executar:

- `bun run dev` - Inicia o servidor de desenvolvimento com hot reload
- `bun run build` - Cria uma versão otimizada para produção
- `bun run preview` - Visualiza localmente a build de produção
- `bun run lint` - Verifica problemas de lint no código

## Estrutura do Projeto

```
promo-eye-app/
├── public/              # Arquivos estáticos
├── src/                 # Código fonte da aplicação
│   ├── components/      # Componentes reutilizáveis
│   ├── lib/             # Funções utilitárias e bibliotecas
│   ├── pages/           # Páginas da aplicação
│   └── types/           # Tipos TypeScript
├── supabase/            # Configurações e funções do Supabase
├── .env                 # Variáveis de ambiente (não versionado)
├── package.json         # Scripts e dependências do projeto
└── vite.config.ts       # Configuração do Vite
```

## Deploy

Para fazer deploy da aplicação, você pode usar plataformas como Vercel, Netlify ou Cloudflare Pages, que suportam projetos Vite/React.

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NomeDaFeature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/NomeDaFeature`)
5. Abra um Pull Request
