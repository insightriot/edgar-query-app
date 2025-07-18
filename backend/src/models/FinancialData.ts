import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Company } from './Company';
import { Filing } from './Filing';

@Entity('financial_data')
@Index(['cik', 'concept'])
@Index(['periodEndDate'])
export class FinancialData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, name: 'accession_number' })
  accessionNumber!: string;

  @Column({ type: 'varchar', length: 10 })
  cik!: string;

  @Column({ type: 'varchar', length: 100 })
  concept!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  value?: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit?: string;

  @Column({ type: 'date', name: 'period_start', nullable: true })
  periodStart?: Date;

  @Column({ type: 'date', name: 'period_end', nullable: true })
  periodEnd?: Date;

  @Column({ type: 'date', name: 'period_end_date', nullable: true })
  periodEndDate?: Date;

  @Column({ type: 'date', name: 'instant_date', nullable: true })
  instantDate?: Date;

  @Column({ type: 'varchar', length: 10, name: 'form_type', nullable: true })
  formType?: string;

  @ManyToOne(() => Company, company => company.financialData)
  @JoinColumn({ name: 'cik' })
  company!: Company;

  @ManyToOne(() => Filing, filing => filing.financialData)
  @JoinColumn({ name: 'accession_number' })
  filing!: Filing;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}