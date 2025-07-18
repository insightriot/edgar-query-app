import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { User } from './User';

@Entity('query_history')
@Index(['userId'])
@Index(['createdAt'])
export class QueryHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId?: string;

  @Column({ type: 'text' })
  query!: string;

  @Column({ type: 'jsonb', name: 'parsed_query', nullable: true })
  parsedQuery?: any;

  @Column({ type: 'jsonb', nullable: true })
  results?: any;

  @Column({ type: 'integer', name: 'execution_time', nullable: true })
  executionTime?: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @ManyToOne(() => User, user => user.queryHistory)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}