import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default symptoms...');

  const symptoms = [
    { name: 'Headache', category: 'pain' as const },
    { name: 'Fatigue', category: 'other' as const },
    { name: 'Joint Pain', category: 'pain' as const },
    { name: 'Muscle Pain', category: 'pain' as const },
    { name: 'Nausea', category: 'digestive' as const },
    { name: 'Brain Fog', category: 'neurological' as const },
    { name: 'Dizziness', category: 'neurological' as const },
    { name: 'Insomnia', category: 'mental' as const },
    { name: 'Anxiety', category: 'mental' as const },
    { name: 'Stomach Pain', category: 'digestive' as const },
    { name: 'Back Pain', category: 'pain' as const },
  ];

  for (const symptom of symptoms) {
    await prisma.symptom.upsert({
      where: {
        // system symptoms have no userId; match on name + null userId via raw
        id: `seed-symptom-${symptom.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {},
      create: {
        id: `seed-symptom-${symptom.name.toLowerCase().replace(/\s+/g, '-')}`,
        userId: null,
        name: symptom.name,
        category: symptom.category,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${symptoms.length} default symptoms.`);

  console.log('Seeding default habits...');

  const habits = [
    { name: 'Sleep Duration', trackingType: 'duration' as const, unit: 'minutes' },
    { name: 'Water Intake', trackingType: 'numeric' as const, unit: 'glasses' },
    { name: 'Exercise', trackingType: 'boolean' as const, unit: null },
    { name: 'Alcohol', trackingType: 'boolean' as const, unit: null },
    { name: 'Caffeine', trackingType: 'numeric' as const, unit: 'cups' },
  ];

  for (const habit of habits) {
    await prisma.habit.upsert({
      where: {
        id: `seed-habit-${habit.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {},
      create: {
        id: `seed-habit-${habit.name.toLowerCase().replace(/\s+/g, '-')}`,
        userId: null,
        name: habit.name,
        trackingType: habit.trackingType,
        unit: habit.unit,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${habits.length} default habits.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
