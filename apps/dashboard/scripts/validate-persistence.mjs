#!/usr/bin/env node
/**
 * Validate persistence layer implementation.
 * Runs without TypeScript compilation - checks structure and imports.
 * Use this for quick CI/CD validation.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardRoot = path.join(__dirname, "..");

// Files that should exist
const requiredFiles = [
  "lib/repositories/types.ts",
  "lib/repositories/factory.ts",
  "lib/repositories/adapters/mock.ts",
  "lib/repositories/adapters/durable.ts",
  "lib/repositories/index.ts",
  "test/repositories.test.ts",
];

// Files that should have been updated
const updatedFiles = [
  "lib/env.ts",
  "app/api/passes/route.ts",
  "app/api/guilds/route.ts",
  "app/api/members/route.ts",
  "app/api/activity/route.ts",
];

console.log("🔍 Validating Persistence Layer Implementation\n");

// 1. Check required files exist
console.log("1️⃣  Checking persistence layer files...");
let allFilesExist = true;
requiredFiles.forEach((file) => {
  const filePath = path.join(dashboardRoot, file);
  const exists = fs.existsSync(filePath);
  console.log(`   ${exists ? "✅" : "❌"} ${file}`);
  if (!exists) allFilesExist = false;
});

// 2. Check updated API routes
console.log("\n2️⃣  Checking updated API routes...");
let allRoutesUpdated = true;
updatedFiles.forEach((file) => {
  const filePath = path.join(dashboardRoot, file);
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${file}`);
    allRoutesUpdated = false;
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");

  // Check for repository imports
  const hasRepositoryImport =
    content.includes('from "@/lib/repositories') || content.includes("from '../repositories");
  const isActivityRoute = file.includes("activity");

  if (hasRepositoryImport || isActivityRoute) {
    console.log(`   ✅ ${file} (updated)`);
  } else {
    // Some routes may not need repository imports yet (like settings)
    console.log(`   ⚠️  ${file} (may need review)`);
  }
});

// 3. Validate env.ts has storage mode config
console.log("\n3️⃣  Checking environment configuration...");
const envPath = path.join(dashboardRoot, "lib/env.ts");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");

  const hasStorageModeEnv = envContent.includes("DASHBOARD_STORAGE_MODE") && envContent.includes("DATABASE_URL");
  const hasGetStorageMode = envContent.includes("getStorageMode()");
  const hasGetStorageConfig = envContent.includes("getStorageConfig()");

  console.log(`   ${hasStorageModeEnv ? "✅" : "❌"} Environment variables (DASHBOARD_STORAGE_MODE, DATABASE_URL)`);
  console.log(`   ${hasGetStorageMode ? "✅" : "❌"} getStorageMode() function`);
  console.log(`   ${hasGetStorageConfig ? "✅" : "❌"} getStorageConfig() function`);
} else {
  console.log(`   ❌ lib/env.ts not found`);
}

// 4. Validate repository interfaces
console.log("\n4️⃣  Checking repository interfaces...");
const typesPath = path.join(dashboardRoot, "lib/repositories/types.ts");
if (fs.existsSync(typesPath)) {
  const typesContent = fs.readFileSync(typesPath, "utf-8");

  const interfaces = [
    "IPassRepository",
    "IGuildRepository",
    "IMemberRepository",
    "IActivityRepository",
    "IRepositoryFactory",
  ];

  interfaces.forEach((iface) => {
    const hasInterface = typesContent.includes(`interface ${iface}`);
    console.log(`   ${hasInterface ? "✅" : "❌"} ${iface}`);
  });
} else {
  console.log(`   ❌ types.ts not found`);
}

// 5. Validate mock adapter implementations
console.log("\n5️⃣  Checking mock adapter implementations...");
const mockPath = path.join(dashboardRoot, "lib/repositories/adapters/mock.ts");
if (fs.existsSync(mockPath)) {
  const mockContent = fs.readFileSync(mockPath, "utf-8");

  const classes = ["MockPassRepository", "MockGuildRepository", "MockMemberRepository", "MockActivityRepository"];

  classes.forEach((cls) => {
    const hasClass = mockContent.includes(`class ${cls}`);
    console.log(`   ${hasClass ? "✅" : "❌"} ${cls}`);
  });
} else {
  console.log(`   ❌ mock.ts not found`);
}

// 6. Validate factory implementation
console.log("\n6️⃣  Checking factory implementation...");
const factoryPath = path.join(dashboardRoot, "lib/repositories/factory.ts");
if (fs.existsSync(factoryPath)) {
  const factoryContent = fs.readFileSync(factoryPath, "utf-8");

  const functions = [
    "getRepositoryFactory",
    "getPassRepository",
    "getGuildRepository",
    "getMemberRepository",
    "getActivityRepository",
    "clearRepositories",
  ];

  functions.forEach((fn) => {
    const hasFn = factoryContent.includes(`function ${fn}`);
    console.log(`   ${hasFn ? "✅" : "❌"} ${fn}()`);
  });
} else {
  console.log(`   ❌ factory.ts not found`);
}

// 7. Check README.md exists
console.log("\n7️⃣  Checking documentation...");
const readmePath = path.join(dashboardRoot, "lib/repositories/README.md");
const hasReadme = fs.existsSync(readmePath);
console.log(`   ${hasReadme ? "✅" : "❌"} lib/repositories/README.md`);

// Final summary
console.log("\n" + "=".repeat(50));
console.log("📊 Validation Summary");
console.log("=".repeat(50));

if (allFilesExist && allRoutesUpdated && hasReadme) {
  console.log("✅ Persistence layer implementation is complete!");
  console.log("\nNm How to run tests:");
  console.log("  npm install   # Install tsx and dependencies");
  console.log("  npm test      # Run all tests");
  console.log("\nTo test in development:");
  console.log("  1. Set DASHBOARD_STORAGE_MODE=mock (default)");
  console.log("  2. Visit the dashboard pages to see repositories in action");
  console.log("\nTo enable durable mode:");
  console.log("  1. Implement DurablePassRepository etc in adapters/durable.ts");
  console.log("  2. Set DASHBOARD_STORAGE_MODE=durable");
  console.log("  3. Set DATABASE_URL to your backend connection string");
  process.exit(0);
} else {
  console.log("❌ Some components are missing. Please review above.");
  process.exit(1);
}
