import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetComics() {
    console.log("Menghapus semua data dari database (kecuali akun User/Admin)...");
    
    try {
        const deletedPages = await prisma.page.deleteMany({});
        console.log(`- ${deletedPages.count} Halaman (Pages) berhasil dihapus.`);

        const deletedChapters = await prisma.chapter.deleteMany({});
        console.log(`- ${deletedChapters.count} Chapter berhasil dihapus.`);

        const deletedProgress = await prisma.readingProgress.deleteMany({});
        console.log(`- ${deletedProgress.count} Riwayat Baca (Progress) berhasil dihapus.`);

        const deletedBookmarks = await prisma.bookmark.deleteMany({});
        console.log(`- ${deletedBookmarks.count} Bookmark berhasil dihapus.`);

        const deletedComics = await prisma.comic.deleteMany({});
        console.log(`- ${deletedComics.count} Komik berhasil dihapus.`);

        console.log("\nDatabase komik telah berhasil dikosongkan!");
    } catch (error) {
        console.error("Terjadi kesalahan saat menghapus database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

resetComics();
