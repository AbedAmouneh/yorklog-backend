import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding YorkLog database…');

  // ── Department ────────────────────────────────────────────────────────────────
  const dept = await prisma.department.upsert({
    where: { name: 'Development & IT' },
    update: {},
    create: {
      name: 'Development & IT',
      maxDailyHours: 8,
    },
  });
  console.log(`  ✓ Department: ${dept.name}`);

  // ── Super admin ───────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@YorkLog2024', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@yorkpress.co.uk' },
    update: {},
    create: {
      name: 'YorkLog Admin',
      email: 'admin@yorkpress.co.uk',
      passwordHash: adminPassword,
      role: 'super_admin',
      departmentId: dept.id,
    },
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // ── Demo department manager ───────────────────────────────────────────────────
  const managerPassword = await bcrypt.hash('Manager@123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@yorkpress.co.uk' },
    update: {},
    create: {
      name: 'Sara Manager',
      email: 'manager@yorkpress.co.uk',
      passwordHash: managerPassword,
      role: 'dept_manager',
      departmentId: dept.id,
    },
  });
  console.log(`  ✓ Manager: ${manager.email}`);

  // ── Demo employee ─────────────────────────────────────────────────────────────
  const empPassword = await bcrypt.hash('Employee@123', 10);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@yorkpress.co.uk' },
    update: {},
    create: {
      name: 'John Developer',
      email: 'employee@yorkpress.co.uk',
      passwordHash: empPassword,
      role: 'employee',
      departmentId: dept.id,
    },
  });
  console.log(`  ✓ Employee: ${employee.email}`);

  // ── HR / Finance user ─────────────────────────────────────────────────────────
  const hrPassword = await bcrypt.hash('HR@Finance123', 10);
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@yorkpress.co.uk' },
    update: {},
    create: {
      name: 'Lena HR',
      email: 'hr@yorkpress.co.uk',
      passwordHash: hrPassword,
      role: 'hr_finance',
      departmentId: dept.id,
    },
  });
  console.log(`  ✓ HR: ${hrUser.email}`);

  // ── Projects ──────────────────────────────────────────────────────────────────
  const projects = [
    {
      name: 'York Press Website',
      description: 'Main company website development and maintenance',
      maxDailyHours: 8,
    },
    {
      name: 'Internal Tools',
      description: 'Internal dashboards, automation, and tooling',
      maxDailyHours: 8,
    },
    {
      name: 'Content Management System',
      description: 'York Press CMS platform',
      maxDailyHours: 8,
    },
    {
      name: 'Infrastructure & DevOps',
      description: 'Servers, hosting, deployment pipelines',
      maxDailyHours: 8,
    },
  ];

  const taskTypesByProject = {
    'York Press Website': [
      { name: 'Web Development', isQuickAccess: true },
      { name: 'Bug Fixing / Maintenance', isQuickAccess: true },
      { name: 'UI / UX Design', isQuickAccess: false },
      { name: 'Testing & QA', isQuickAccess: false },
      { name: 'Meetings / Communication', isQuickAccess: true },
      { name: 'Research', isQuickAccess: false },
    ],
    'Internal Tools': [
      { name: 'Web Development', isQuickAccess: true },
      { name: 'Bug Fixing / Maintenance', isQuickAccess: true },
      { name: 'Meetings / Communication', isQuickAccess: true },
      { name: 'Documentation', isQuickAccess: false },
    ],
    'Content Management System': [
      { name: 'Web Development', isQuickAccess: true },
      { name: 'Bug Fixing / Maintenance', isQuickAccess: true },
      { name: 'Database Work', isQuickAccess: false },
      { name: 'Testing & QA', isQuickAccess: false },
      { name: 'Meetings / Communication', isQuickAccess: true },
    ],
    'Infrastructure & DevOps': [
      { name: 'DevOps / Deployment', isQuickAccess: true },
      { name: 'Server Management', isQuickAccess: true },
      { name: 'Monitoring & Alerts', isQuickAccess: false },
      { name: 'Security Updates', isQuickAccess: false },
      { name: 'Meetings / Communication', isQuickAccess: true },
    ],
  };

  for (const projectData of projects) {
    const project = await prisma.project.upsert({
      where: { name: projectData.name },
      update: {},
      create: { ...projectData, createdById: admin.id },
    });
    console.log(`  ✓ Project: ${project.name}`);

    // Create task types for this project
    const taskTypes = taskTypesByProject[projectData.name] ?? [];
    for (const taskData of taskTypes) {
      await prisma.taskType.upsert({
        where: { projectId_name: { projectId: project.id, name: taskData.name } },
        update: {},
        create: { ...taskData, projectId: project.id },
      });
    }
    console.log(`    + ${taskTypes.length} task types`);

    // Assign all users to all projects
    for (const userId of [admin.id, manager.id, employee.id, hrUser.id]) {
      await prisma.projectAssignment.upsert({
        where: { projectId_userId: { projectId: project.id, userId } },
        update: {},
        create: { projectId: project.id, userId },
      });
    }
    console.log(`    + All users assigned`);
  }

  console.log('\n✅ Seed complete!\n');
  console.log('─'.repeat(50));
  console.log('Demo credentials:');
  console.log('  Super Admin : admin@yorkpress.co.uk    / Admin@YorkLog2024');
  console.log('  Manager     : manager@yorkpress.co.uk  / Manager@123');
  console.log('  Employee    : employee@yorkpress.co.uk / Employee@123');
  console.log('  HR          : hr@yorkpress.co.uk       / HR@Finance123');
  console.log('─'.repeat(50));
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
