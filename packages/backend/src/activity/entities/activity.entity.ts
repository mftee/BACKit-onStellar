import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ActivityType {
  CALL_CREATED = 'CALL_CREATED',
  STAKE_PLACED = 'STAKE_PLACED',
  PAYOUT_CLAIMED = 'PAYOUT_CLAIMED',
  NEW_FOLLOWER = 'NEW_FOLLOWER',
}

@Entity('activity')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userAddress: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  type: ActivityType;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
