import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'
import {
  AppRole,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  ROLE_DEFINITIONS,
} from '../src/modules/auth/roles.constants.js'
import { seedSuperAdmin } from './seed-superadmin.js'

export async function seed() {
  console.log('🌱 Starting InjeraOS RBAC seeding...')

  // 1. Seed Granular Permissions
  console.log('Seeding system permissions...')
  const permissionMap = new Map<string, string>()

  for (const [code, description] of Object.entries(PERMISSION_DEFINITIONS)) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    })
    permissionMap.set(code, permission.id)
  }
  console.log(`✓ Seeded ${permissionMap.size} system permissions.`)

  // 2. Seed System Roles and default Permission Mappings
  console.log('Seeding system template roles...')
  for (const roleKey of Object.values(AppRole)) {
    const meta = ROLE_DEFINITIONS[roleKey]
    let role = await prisma.role.findFirst({
      where: { businessId: null, name: meta.name },
    })

    if (!role) {
      role = await prisma.role.create({
        data: {
          businessId: null,
          name: meta.name,
          description: meta.description,
          isSystem: true,
        },
      })
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          description: meta.description,
          isSystem: true,
        },
      })
    }

    // Link assigned permissions
    const permissionsForRole = DEFAULT_ROLE_PERMISSIONS[roleKey]
    if (permissionsForRole.includes('*')) {
      // Wildcard role (e.g. OWNER) does not require explicit join rows
      continue
    }

    for (const permCode of permissionsForRole) {
      const permissionId = permissionMap.get(permCode)
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId,
          },
        })
      }
    }
  }

  console.log('✓ Seeded system roles and role-permission associations.')
  console.log('✅ RBAC Seeding completed successfully.')

  // 3. Provision Flagship Super Administrator & Workspace
  await seedSuperAdmin()
}

seed()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
