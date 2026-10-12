import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import mysql, { type Pool } from 'mysql2/promise';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { connectionOptions } from './connection-options.js';

export const DB_POOL = Symbol('DB_POOL');

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): Pool =>
        mysql.createPool({
          ...connectionOptions(config.database),
          connectionLimit: 10,
        }),
    },
  ],
  exports: [DB_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
