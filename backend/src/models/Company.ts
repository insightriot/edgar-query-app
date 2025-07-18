import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Filing } from './Filing';
import { FinancialData } from './FinancialData';

@Entity('companies')
export class Company {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  cik!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  ticker?: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  sic?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  industry?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sector?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  exchange?: string;

  @Column({ type: 'integer', nullable: true })
  employees?: number;

  @Column({ type: 'date', nullable: true })
  founded?: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Filing, filing => filing.company)
  filings!: Filing[];

  @OneToMany(() => FinancialData, financialData => financialData.company)
  financialData!: FinancialData[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}