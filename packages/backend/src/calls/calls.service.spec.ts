import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CallsService } from './calls.service';
import { CallsRepository } from './calls.repository';
import { CallReport } from './entities/call-report.entity';
import { OracleService } from '../oracle/oracle.service';
import { IpfsService } from '../storage/ipfs.service';

describe('CallsService', () => {
  let service: CallsService;

  const callsRepository = {
    findFeedByFollowing: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const callReportRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const oracleService = {};
  const ipfsService = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallsService,
        { provide: CallsRepository, useValue: callsRepository },
        {
          provide: getRepositoryToken(CallReport),
          useValue: callReportRepository,
        },
        { provide: OracleService, useValue: oracleService },
        { provide: IpfsService, useValue: ipfsService },
      ],
    }).compile();

    service = module.get<CallsService>(CallsService);
  });

  it('returns following feed with pagination', async () => {
    callsRepository.findFeedByFollowing.mockResolvedValue([[{ id: 'c1' }], 1]);

    const result = await service.getFollowingFeed('GA123', {
      page: 2,
      limit: 5,
    });

    expect(callsRepository.findFeedByFollowing).toHaveBeenCalledWith(
      'GA123',
      2,
      5,
    );
    expect(result).toEqual({
      data: [{ id: 'c1' }],
      total: 1,
      page: 2,
      limit: 5,
    });
  });

  it('returns empty list when user follows nobody', async () => {
    callsRepository.findFeedByFollowing.mockResolvedValue([[], 0]);

    const result = await service.getFollowingFeed('GA999', {});

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  describe('reportCall', () => {
    it('throws rate limit exception if over 10 reports in an hour', async () => {
      callsRepository.findOne.mockResolvedValue({ id: 'c1' });
      callReportRepository.count.mockResolvedValue(10);

      await expect(
        service.reportCall('c1', 'addr', { reason: 'SPAM' as any }),
      ).rejects.toThrow('Rate limit exceeded: max 10 reports per hour');
    });

    it('allows report if under 10 reports in an hour', async () => {
      const call = { id: 'c1', reportCount: 0, isHidden: false };
      callsRepository.findOne.mockResolvedValue(call);
      callReportRepository.count.mockResolvedValue(9);
      callReportRepository.findOne.mockResolvedValue(null);
      callReportRepository.create.mockReturnValue({
        callId: 'c1',
        reporterAddress: 'addr',
        reason: 'SPAM',
      });
      callReportRepository.save.mockResolvedValue(null);

      const result = await service.reportCall('c1', 'addr', {
        reason: 'SPAM' as any,
      });

      expect(result.reportCount).toBe(1);
      expect(result.isHidden).toBe(false);
      expect(callsRepository.save).toHaveBeenCalledWith({
        id: 'c1',
        reportCount: 1,
        isHidden: false,
      });
    });
  });
});
