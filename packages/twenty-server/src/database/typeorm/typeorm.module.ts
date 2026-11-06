import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataSource, type DataSourceOptions } from 'typeorm';

import { typeORMCoreModuleOptions } from 'src/database/typeorm/core/core.datasource';
import { PostgresAdvisoryLockService } from 'src/database/typeorm/postgres-advisory-lock.service';
import { installUpgradeAwareRepositoryProxy } from 'src/engine/twenty-orm/upgrade-aware/install-upgrade-aware-repository-proxy';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => typeORMCoreModuleOptions,
      dataSourceFactory: async (options) => {
        const dataSource = new DataSource(options as DataSourceOptions);

        await dataSource.initialize();
        installUpgradeAwareRepositoryProxy(dataSource);

        return dataSource;
      },
    }),
  ],
  providers: [PostgresAdvisoryLockService],
  exports: [PostgresAdvisoryLockService],
})
export class TypeORMModule {}
