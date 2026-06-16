import { DataSource } from 'typeorm';
import { User } from './common/models/user.entity';
import { Evaluation } from './common/models/evaluation.entity';
import { Property } from './common/models/property.entity';

// Usado exclusivamente pelo TypeORM CLI (migration:generate, migration:run, etc.)
// Carregar variáveis via: ts-node -r dotenv/config
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'avaliapro',
  entities: [User, Evaluation, Property],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
