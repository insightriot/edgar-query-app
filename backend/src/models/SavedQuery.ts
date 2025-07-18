import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { User } from './User';

@Entity('saved_queries')
@Index(['userId'])
export class SavedQuery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  query!: string;

  @Column({ type: 'jsonb', nullable: true })
  filters?: any;

  @Column({ type: 'jsonb', nullable: true })
  schedule?: any;

  @ManyToOne(() => User, user => user.savedQueries)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}