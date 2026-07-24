import prisma from './prismaClient.js';

async function main() {
  console.log('Seeding dummy comic data...');

  // Create a dummy comic
  const comic = await prisma.comic.create({
    data: {
      title: 'Solo Leveling',
      description: 'In a world where hunters must battle deadly monsters to protect humanity, Sung Jinwoo, the weakest hunter of them all, finds himself in a struggle for survival.',
      coverUrl: 'https://m.media-amazon.com/images/I/81sQz9Y-2dL._AC_UF1000,1000_QL80_.jpg',
      sourceId: 'dummy-source',
      chapters: {
        create: [
          {
            title: 'Chapter 1: The Weakest Hunter',
            chapterNumber: 1,
            pages: {
              create: [
                { pageNumber: 1, imageUrl: 'https://via.placeholder.com/800x1200.png?text=Solo+Leveling+Page+1' },
                { pageNumber: 2, imageUrl: 'https://via.placeholder.com/800x1200.png?text=Solo+Leveling+Page+2' },
                { pageNumber: 3, imageUrl: 'https://via.placeholder.com/800x1200.png?text=Solo+Leveling+Page+3' },
              ]
            }
          }
        ]
      }
    }
  });

  console.log('Successfully added dummy comic:', comic.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
