import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

@Global()
@Module({
  providers: [
    LocalStorageService,
    S3StorageService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (
        configService: ConfigService,
        localStorageService: LocalStorageService,
        s3StorageService: S3StorageService,
      ) => {
        const provider = configService.get<string>('STORAGE_PROVIDER', 'local');

        switch (provider) {
          case 's3':
            return s3StorageService;
          case 'local':
          default:
            return localStorageService;
        }
      },
      inject: [ConfigService, LocalStorageService, S3StorageService],
    },
  ],
  exports: [STORAGE_PROVIDER, LocalStorageService],
})
export class StorageModule {}
