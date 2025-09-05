#!/usr/bin/env node

/**
 * Flush All Spaces Script
 * 
 * This script removes all spaces and related data from the database.
 * Use with caution as this action is irreversible!
 * 
 * Usage:
 * npm run flush-spaces
 * or
 * npm run flush-spaces -- --confirm
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message: string, color = colors.white) {
  
}

function logSection(title: string) {
  log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function confirmAction(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      `${colors.yellow}${colors.bold}⚠️  Are you absolutely sure you want to DELETE ALL SPACES? This action cannot be undone! (type 'DELETE' to confirm): ${colors.reset}`,
      (answer) => {
        rl.close();
        resolve(answer.trim() === 'DELETE');
      }
    );
  });
}

async function getSpaceStats() {
  try {
    const stats = await prisma.space.aggregate({
      _count: {
        id: true
      }
    });

    const activeSpaces = await prisma.space.count({
      where: {
        isActive: true
      }
    });

    const inactiveSpaces = await prisma.space.count({
      where: {
        isActive: false
      }
    });

    return {
      total: stats._count.id,
      active: activeSpaces,
      inactive: inactiveSpaces
    };
  } catch (error) {
    logError('Failed to get space statistics');
    return null;
  }
}

async function getRelatedDataStats() {
  try {
    const streamCount = await prisma.stream.count();
    const currentStreamCount = await prisma.currentStream.count();
    const upvoteCount = await prisma.upvote.count();

    return {
      streams: streamCount,
      currentStreams: currentStreamCount,
      upvotes: upvoteCount
    };
  } catch (error) {
    logError('Failed to get related data statistics');
    return null;
  }
}

async function flushAllSpaces() {
  try {
    logSection('Database Cleanup Started');

    // Get initial statistics
    const stats = await getSpaceStats();
    const relatedStats = await getRelatedDataStats();

    if (!stats) {
      logError('Could not retrieve space statistics. Aborting.');
      return;
    }

    logInfo(`Found ${stats.total} spaces (${stats.active} active, ${stats.inactive} inactive)`);
    
    if (relatedStats) {
      logInfo(`Related data: ${relatedStats.streams} streams, ${relatedStats.currentStreams} current streams, ${relatedStats.upvotes} upvotes`);
    }

    if (stats.total === 0) {
      logWarning('No spaces found in the database.');
      return;
    }

    // Delete related data first (due to foreign key constraints)
    logSection('Cleaning Related Data');

    // Delete upvotes first
    if (relatedStats && relatedStats.upvotes > 0) {
      const deletedUpvotes = await prisma.upvote.deleteMany({});
      logSuccess(`Deleted ${deletedUpvotes.count} upvotes`);
    }

    // Delete current streams
    if (relatedStats && relatedStats.currentStreams > 0) {
      const deletedCurrentStreams = await prisma.currentStream.deleteMany({});
      logSuccess(`Deleted ${deletedCurrentStreams.count} current streams`);
    }

    // Delete streams
    if (relatedStats && relatedStats.streams > 0) {
      const deletedStreams = await prisma.stream.deleteMany({});
      logSuccess(`Deleted ${deletedStreams.count} streams`);
    }

    logSection('Deleting Spaces');

    // Delete all spaces
    const deletedSpaces = await prisma.space.deleteMany({});
    logSuccess(`Successfully deleted ${deletedSpaces.count} spaces`);

    logSection('Cleanup Complete');
    logSuccess('All spaces and related data have been successfully removed from the database');

    // Verify cleanup
    const finalStats = await getSpaceStats();
    if (finalStats && finalStats.total === 0) {
      logSuccess('Verification: Database is clean - no spaces remaining');
    } else {
      logWarning('Verification: Some spaces may still exist in the database');
    }

  } catch (error) {
    logError('Failed to flush spaces from database');
    console.error(error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const skipConfirmation = args.includes('--confirm');

  try {
    logSection('Deciball Database Space Flush Utility');
    logWarning('This script will permanently delete ALL spaces and related data from the database');

    if (!skipConfirmation) {
      const confirmed = await confirmAction();
      if (!confirmed) {
        logInfo('Operation cancelled by user');
        return;
      }
    } else {
      logWarning('Skipping confirmation due to --confirm flag');
    }

    await flushAllSpaces();

  } catch (error) {
    logError('Script execution failed');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  log('\n\nScript interrupted by user', colors.yellow);
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('\n\nScript terminated', colors.yellow);
  await prisma.$disconnect();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

export { flushAllSpaces };
