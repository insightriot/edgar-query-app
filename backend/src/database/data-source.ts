import { DataSource } from 'typeorm';
import { Company } from '../models/Company';
import { Filing } from '../models/Filing';
import { FinancialData } from '../models/FinancialData';
import { User } from '../models/User';
import { QueryHistory } from '../models/QueryHistory';
import { SavedQuery } from '../models/SavedQuery';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'edgar_db',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [Company, Filing, FinancialData, User, QueryHistory, SavedQuery],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: ['src/database/subscribers/*.ts'],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});