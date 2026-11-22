import 'dotenv/config'
import bcrypt from 'bcrypt'
import { prisma } from '../src/lib/prisma.js'
import {
  AppRole,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  ROLE_DEFINITIONS,
} from '../src/modules/auth/roles.constants.js'
import { updateSystemSettings } from '../src/modules/system/system.service.js'

export interface SeedSuperAdminOptions {
  email?: string
  password?: string
  name?: string
  phone?: string
  businessName?: string
  legalName?: string
  branchName?: string
  branchCode?: string
}

export async function seedSuperAdmin(options: SeedSuperAdminOptions = {}) {
  const email = (options.email ?? process.env.SUPERADMIN_EMAIL ?? 'superadmin@kdplc.et').toLowerCase().trim()
  const password = options.password ?? process.env.SUPERADMIN_PASSWORD ?? 'SuperAdmin@KD2026!'
  const name = options.name ?? process.env.SUPERADMIN_NAME ?? 'KD PLC Super Administrator'
  const phone = options.phone ?? process.env.SUPERADMIN_PHONE ?? '+251911223344'
  const businessName = options.businessName ?? process.env.SUPERADMIN_BUSINESS_NAME ?? 'KD PLC Commercial Injera Bakery'
  const legalName = options.legalName ?? process.env.SUPERADMIN_LEGAL_NAME ?? 'KD PLC Agro-Processing & Food Manufacturing Share Co.'
  const branchName = options.branchName ?? process.env.SUPERADMIN_BRANCH_NAME ?? 'Addis Ababa Central Baking Plant'
  const branchCode = options.branchCode ?? process.env.SUPERADMIN_BRANCH_CODE ?? 'HQ-CENTRAL'

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌱 InjeraOS Super Administrator & Flagship Tenant Seeder')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Target Email:         ${email}`)
  console.log(`Target Business:      ${businessName}`)
  console.log(`Target Branch:        ${branchName} (${branchCode})`)

  // 1. Ensure Global Permissions Exist
  console.log('\n[1/6] Verifying System Permissions in Database...')
  const permissionMap = new Map<string, string>()
  for (const [code, description] of Object.entries(PERMISSION_DEFINITIONS)) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    })
    permissionMap.set(code, perm.id)
  }
  console.log(`  ✓ Checked ${permissionMap.size} system permissions.`)

  // 2. Upsert SuperAdmin User Account with Bcrypt Hash
  console.log('\n[2/6] Provisioning SuperAdmin User Account...')
  const passwordHash = await bcrypt.hash(password, 12)
  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        passwordHash,
      },
    })
    console.log(`  ✓ Created user "${name}" [${user.id}].`)
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        phone,
        passwordHash,
      },
    })
    console.log(`  ✓ Updated existing user credentials for "${name}" [${user.id}].`)
  }

  // 3. Upsert Flagship Business (KD PLC)
  console.log('\n[3/6] Setting up Flagship Business Tenant...')
  let business = await prisma.business.findFirst({
    where: {
      OR: [{ name: businessName }, { legalName }],
    },
  })

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: businessName,
        legalName,
        phone,
        email,
        address: 'Bole Sub-City, Kebele 03, Industrial Zone, Addis Ababa, Ethiopia',
        currency: 'ETB',
        timezone: 'Africa/Addis_Ababa',
        dateCalendar: 'ETHIOPIAN',
        status: 'ACTIVE',
      },
    })
    console.log(`  ✓ Created business "${businessName}" [${business.id}].`)
  } else {
    business = await prisma.business.update({
      where: { id: business.id },
      data: {
        name: businessName,
        legalName,
        currency: 'ETB',
        timezone: 'Africa/Addis_Ababa',
        status: 'ACTIVE',
      },
    })
    console.log(`  ✓ Updated business "${businessName}" [${business.id}].`)
  }

  // 4. Ensure Central Baking Plant Branch
  console.log('\n[4/6] Ensuring Flagship Production Branch & Depot...')
  let branch = await prisma.branch.findFirst({
    where: {
      businessId: business.id,
      code: branchCode,
    },
  })

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        businessId: business.id,
        name: branchName,
        code: branchCode,
        address: 'Bole Industrial Plant, Building 4',
        phone,
        isMain: true,
        status: 'ACTIVE',
      },
    })
    console.log(`  ✓ Created main branch "${branchName}" [${branch.code}].`)
  } else {
    branch = await prisma.branch.update({
      where: { id: branch.id },
      data: {
        name: branchName,
        isMain: true,
        status: 'ACTIVE',
      },
    })
    console.log(`  ✓ Refreshed main branch "${branchName}" [${branch.code}].`)
  }

  // 5. Ensure Business Roles & Link OWNER Membership
  console.log('\n[5/6] Ensuring RBAC Roles & SuperAdmin Membership...')
  let ownerRole: { id: string; name: string } | null = null

  for (const roleKey of Object.values(AppRole)) {
    const meta = ROLE_DEFINITIONS[roleKey]
    let role = await prisma.role.findFirst({
      where: {
        businessId: business.id,
        name: meta.name,
      },
    })

    if (!role) {
      role = await prisma.role.create({
        data: {
          businessId: business.id,
          name: meta.name,
          description: meta.description,
          isSystem: meta.isSystem,
        },
      })
    }

    if (roleKey === AppRole.OWNER) {
      ownerRole = role
    }

    // Attach role permissions if not wildcard
    const perms = DEFAULT_ROLE_PERMISSIONS[roleKey]
    if (!perms.includes('*')) {
      for (const pCode of perms) {
        const pId = permissionMap.get(pCode)
        if (pId) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: pId,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: pId,
            },
          })
        }
      }
    }
  }

  if (!ownerRole) {
    throw new Error('Failed to resolve OWNER role for business')
  }

  // Upsert BusinessMembership
  const membership = await prisma.businessMembership.findFirst({
    where: {
      userId: user.id,
      businessId: business.id,
    },
  })

  if (!membership) {
    await prisma.businessMembership.create({
      data: {
        userId: user.id,
        businessId: business.id,
        roleId: ownerRole.id,
        status: 'ACTIVE',
      },
    })
    console.log(`  ✓ Created active OWNER membership for ${email}.`)
  } else {
    await prisma.businessMembership.update({
      where: { id: membership.id },
      data: {
        roleId: ownerRole.id,
        status: 'ACTIVE',
      },
    })
    console.log(`  ✓ Updated membership to active OWNER for ${email}.`)
  }

  // 6. Initialize System Operational Settings
  console.log('\n[6/6] Initializing Enterprise Operational Settings...')
  await updateSystemSettings(business.id, {
    employeeNumberPrefix: 'KD',
    minQualityYieldPercent: 88,
    tokenSessionDurationMinutes: 720,
    maintenanceMode: false,
    autoSyncIntervalSeconds: 30,
    enforceShiftClockInGraceMinutes: 15,
    allowOfflineTransactions: true,
    currency: 'ETB',
    timezone: 'Africa/Addis_Ababa',
    dateCalendar: 'ETHIOPIAN',
  })
  console.log('  ✓ Configured enterprise settings (Prefix: KD, Yield Benchmark: 88%, Calendar: Ethiopian).')

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 SuperAdmin Seeding Complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Sign-in Credentials:')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log(`  Role:     OWNER / SuperAdministrator`)
  console.log(`  Business: ${businessName}`)
  console.log(`  Branch:   ${branchName} (${branchCode})`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  return { user, business, branch, ownerRole }
}

// Direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSuperAdmin()
    .catch((err) => {
      console.error('❌ Failed to seed SuperAdmin:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
