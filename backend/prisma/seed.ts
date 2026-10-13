import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { phone: '+221770000000' },
    update: {},
    create: {
      phone: '+221770000000',
      name: 'Awa',
    },
  });

  const shop = await prisma.shop.upsert({
    where: { slug: 'awa-couture' },
    update: {},
    create: {
      ownerId: owner.id,
      slug: 'awa-couture',
      name: 'Awa Couture',
      headline: 'Mode wax et bazin faite main',
      area: 'Médina',
      description: 'Mode wax et bazin faite main, livraison rapide à Dakar.',
      rating: 4.9,
      deliveryFee: 1500,
      featured: true,
      status: 'ACTIVE',
      products: {
        create: [
          {
            name: 'Boubou brodé',
            description: 'Brodé à la main, coupe ample. Léger et élégant pour les fêtes.',
            price: 18500,
            stock: 8,
            status: 'ACTIVE',
          },
          {
            name: 'Robe en wax',
            description: 'Coupe droite, wax coloré.',
            price: 12000,
            stock: 12,
            status: 'ACTIVE',
          },
          {
            name: 'Ensemble bazin',
            description: 'Deux pièces élégantes, coupe confortable.',
            price: 25000,
            stock: 4,
            status: 'ACTIVE',
          },
          {
            name: 'Sac en cuir',
            description: 'Petit format, porté épaule.',
            price: 9500,
            stock: 5,
            status: 'ACTIVE',
          },
        ],
      },
    },
  });

  console.log(`Seeded ${shop.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
