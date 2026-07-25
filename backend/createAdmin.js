import bcrypt from 'bcryptjs';
import prisma from './prismaClient.js';

async function createAdmin() {
    const username = 'admin';
    const password = 'password123';

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
        console.log(`User ${username} already exists.`);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data: {
            username,
            password: hashedPassword
        }
    });

    console.log(`Successfully created test account! Username: ${username}, Password: ${password}`);
}

createAdmin()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
