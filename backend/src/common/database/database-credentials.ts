import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';

const getKey = () => {
  const configured = String(process.env.TENANT_DATABASE_ENCRYPTION_KEY || '').trim();
  if (!configured) {
    if (String(process.env.DATABASE_PROVIDER || '').toLowerCase() === 'neon') {
      throw new Error('TENANT_DATABASE_ENCRYPTION_KEY is required when DATABASE_PROVIDER=neon');
    }
    return null;
  }
  const key = /^[a-f0-9]{64}$/i.test(configured)
    ? Buffer.from(configured, 'hex')
    : Buffer.from(configured, 'base64');
  if (key.length !== 32) {
    throw new Error('TENANT_DATABASE_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters or base64');
  }
  return key;
};

export const protectDatabaseUrl = (databaseUrl: string, required = false) => {
  if (databaseUrl.startsWith(PREFIX)) return databaseUrl;
  const key = getKey();
  if (!key) {
    if (required) throw new Error('TENANT_DATABASE_ENCRYPTION_KEY is required for Neon tenant credentials');
    return databaseUrl;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(databaseUrl, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
};

export const revealDatabaseUrl = (storedValue: string) => {
  if (!storedValue?.startsWith(PREFIX)) return storedValue;
  const key = getKey();
  if (!key) throw new Error('Tenant database credential cannot be decrypted without its encryption key');
  const [, , ivValue, tagValue, encryptedValue] = storedValue.split(':');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Stored tenant database credential is malformed');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};
