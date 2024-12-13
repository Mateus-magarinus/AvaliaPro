
# Arquitetura do Sistema e Definição de Tecnologias

## Tecnologias Selecionadas
### Frontend
- NextJS
- Tailwind
### Backend
- NestJS
- npm  v10.9.0
- node v22.12.0(LTS)
### Banco de Dados
- PostgreSQL
### Infraestrutura
- Docker

---

## Estrutura de Pastas
```plaintext
project_root/
├── api/                        # Back-end (NestJS)
│   └── src/
│   │   ├── common/ 
│   │   ├── config/ 
│   │   ├── modules/ 
│   │   │   ├── auth/           
│   │   │   ├── property-manager/           
│   │   │   ├── sample-valuation-service/           
│   │   ├── database/ 
│   │   ├── main.ts             # Ponto de entrada da aplicação
│   │   ├── app.module.ts       # Módulo principal da aplicação
│   ├── .env                    # Variáveis de ambiente (não versionado)
│   ├── .env.example            # Exemplo de variáveis de ambiente
│   ├── package.json            # Dependências do projeto
│   ├── tsconfig.json           # Configurações do TypeScript
├── client/                     # Front-end (NextJS)
│   ├── .env
├── infra/                      # Configurações da Infra (Docker)
├── README.md                   # Documentação do projeto

