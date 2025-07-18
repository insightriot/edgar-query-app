import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, Index } from 'typeorm';
import { Company } from './Company';
import { FinancialData } from './FinancialData';

@Entity('filings')
@Index(['cik', 'filingDate'])
@Index(['formType'])
export class Filing {
  @PrimaryColumn({ type: 'varchar', length: 20, name: 'accession_number' })
  accessionNumber!: string;

  @Column({ type: 'varchar', length: 10 })
  cik!: string;

  @Column({ type: 'varchar', length: 10, name: 'form_type' })
  formType!: string;

  @Column({ type: 'date', name: 'filing_date' })
  filingDate!: Date;

  @Column({ type: 'date', name: 'period_end_date', nullable: true })
  periodEndDate?: Date;

  @Column({ type: 'integer', name: 'document_count', nullable: true })
  documentCount?: number;

  @Column({ type: 'bigint', name: 'file_size', nullable: true })
  fileSize?: number;

  @Column({ type: 'text', name: 'document_url', nullable: true })
  documentUrl?: string;

  @Column({ type: 'boolean', name: 'xbrl_available', default: false })
  xbrlAvailable!: boolean;

  @Column({ type: 'boolean', default: false })
  processed!: boolean;

  @ManyToOne(() => Company, company => company.filings)
  @JoinColumn({ name: 'cik' })
  company!: Company;

  @OneToMany(() => FinancialData, financialData => financialData.filing)
  financialData!: FinancialData[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}