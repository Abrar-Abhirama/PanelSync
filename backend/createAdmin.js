import bcrypt from 'bcryptjs';
import prisma from './prismaClient.js';

async function createAdmin() {
    const username = 'admin';
    const password = 'password123';

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
        where: { username },
        update: {
            password: hashedPassword,
            role: 'ADMIN'
        },
        create: {
            username,
            password: hashedPassword,
            role: 'ADMIN'
        }
    });

    console.log(`Successfully created/updated test account! Username: ${username}, Password: ${password}`);
}

createAdmin()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
