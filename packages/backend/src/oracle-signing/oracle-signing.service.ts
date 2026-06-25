import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  SignedPriceData,
  PricePayload,
  OraclePublicKeyResponse,
} from './oracle.interfaces';

@Injectable()
export class OracleSigningService implements OnModuleInit {
  private readonly logger = new Logger(OracleSigningService.name);
  private privateKey: crypto.KeyObject;
  private publicKey: crypto.KeyObject;
  private publicKeyHex: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.loadKeyPair();
  }

  private loadKeyPair(): void {
    const hexSeed = this.configService.get<string>('ORACLE_PRIVATE_KEY_HEX');

    let seedBuffer: Buffer;
    if (!hexSeed || !/^[0-9a-fA-F]{64}$/.test(hexSeed)) {
      this.logger.warn(
        'ORACLE_PRIVATE_KEY_HEX not set or invalid. Using ephemeral key (not for production).',
      );
      seedBuffer = crypto.randomBytes(32);
    } else {
      seedBuffer = Buffer.from(hexSeed, 'hex');
    }

    this.privateKey = crypto.createPrivateKey({
      key: this.encodePkcs8Ed25519(seedBuffer),
      format: 'der',
      type: 'pkcs8',
    });

    this.publicKey = crypto.createPublicKey(this.privateKey);

    const pubDer = this.publicKey.export({
      type: 'spki',
      format: 'der',
    }) as Buffer;
    this.publicKeyHex = pubDer.slice(-32).toString('hex');

    this.logger.log(`Oracle public key loaded: ${this.publicKeyHex}`);
  }

  private encodePkcs8Ed25519(seed: Buffer): Buffer {
    const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
    return Buffer.concat([pkcs8Header, seed]);
  }

  buildMessage(payload: PricePayload): Buffer {
    const assetBytes = Buffer.from(payload.asset, 'utf8');
    const priceBytes = Buffer.from(payload.price, 'utf8');
    const tsBuf = Buffer.allocUnsafe(8);
    tsBuf.writeBigUInt64BE(BigInt(payload.timestamp));
    return Buffer.concat([assetBytes, priceBytes, tsBuf]);
  }

  sign(payload: PricePayload): SignedPriceData {
    const message = this.buildMessage(payload);
    const signatureBuffer = crypto.sign(null, message, this.privateKey);
    return {
      asset: payload.asset,
      price: payload.price,
      timestamp: payload.timestamp,
      signature: signatureBuffer.toString('hex'),
      publicKey: this.publicKeyHex,
    };
  }

  verify(payload: PricePayload, signatureHex: string): boolean {
    const message = this.buildMessage(payload);
    const signature = Buffer.from(signatureHex, 'hex');
    return crypto.verify(null, message, this.publicKey, signature);
  }

  getPublicKey(): OraclePublicKeyResponse {
    return { publicKey: this.publicKeyHex };
  }

  getPublicKeyHex(): string {
    return this.publicKeyHex;
  }
}
