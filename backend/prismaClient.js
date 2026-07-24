import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

// Prisma Version 7 requires a "Driver Adapter" to talk to PostgreSQL
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Pass the adapter into our Prisma Client
const prisma = new PrismaClient({ adapter });

export default prisma;
