# TODO - Add multi-contract support to the membership indexer

- [x] Step 1: Update Prisma schema to scope checkpoints/events by contractAddress

- [x] Step 2: Refactor indexer code (IndexerConfig + core processing) to be contract-aware

- [x] Step 3: Refactor live poll loop to maintain independent checkpoints + reorg detection per contract

- [x] Step 4: Update env parsing in apps/access-api/src/index.ts for multiple contract addresses (comma-separated)

- [ ] Step 5: Update tests to match new schema semantics
- [ ] Step 6: Add/adjust any docs/migration notes if present
- [ ] Step 7: Run prisma generate/migrate + unit tests

