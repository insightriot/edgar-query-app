import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { QueryHistory } from './QueryHistory';
import { SavedQuery } from './SavedQuery';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: any;

  @OneToMany(() => QueryHistory, queryHistory => queryHistory.user)
  queryHistory!: QueryHistory[];

  @OneToMany(() => SavedQuery, savedQuery => savedQuery.user)
  savedQueries!: SavedQuery[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}