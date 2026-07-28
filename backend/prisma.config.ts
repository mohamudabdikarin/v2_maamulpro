import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';
import { getCentralDatabaseUrls } from './src/common/database/database-url';

dotenv.config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/central/schema.prisma',
  datasource: {
    url: getCentralDatabaseUrls().directUrl,
  },
});
