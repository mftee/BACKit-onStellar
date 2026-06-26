import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity, ActivityType } from './entities/activity.entity';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
  ) {}

  async createActivity(userAddress: string, type: ActivityType, metadata: any) {
    const activity = this.activityRepo.create({ userAddress, type, metadata });
    return this.activityRepo.save(activity);
  }

  async getUserActivity(userAddress: string, page = 1, limit = 20, type?: ActivityType) {
    const query = this.activityRepo.createQueryBuilder('activity')
      .where('activity.userAddress = :userAddress', { userAddress })
      .orderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      query.andWhere('activity.type = :type', { type });
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }

  @OnEvent('call.created')
  handleCallCreated(payload: any) {
    this.createActivity(payload.creatorAddress, ActivityType.CALL_CREATED, { callId: payload.id, title: payload.title });
  }

  @OnEvent('stake.created')
  handleStakePlaced(payload: any) {
    this.createActivity(payload.userAddress, ActivityType.STAKE_PLACED, { callId: payload.callId, amount: payload.amount });
  }

  @OnEvent('payout.claimed')
  handlePayoutClaimed(payload: any) {
    this.createActivity(payload.userAddress, ActivityType.PAYOUT_CLAIMED, { callId: payload.callId, amount: payload.amount });
  }

  @OnEvent('user.followed')
  handleNewFollower(payload: any) {
    this.createActivity(payload.followingAddress, ActivityType.NEW_FOLLOWER, { followerAddress: payload.followerAddress });
  }
}
