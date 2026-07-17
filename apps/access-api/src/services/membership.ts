import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class MembershipService {
  /**
   * Updates or creates a membership record based on an on-chain event.
   * Can be used with a transaction client.
   */
  async handleMembershipCreated(wallet: string, passId: bigint, tx: any = prisma) {
    console.log(`Handling membership created for ${wallet}, pass ${passId}`);
    await tx.membership.upsert({
      where: { wallet_passId: { wallet, passId } },
      update: { status: 1 }, // Active
      create: { wallet, passId, status: 1 },
    });
  }

  /**
   * Updates a membership status based on an on-chain event.
   */
  async handleMembershipUpdated(wallet: string, passId: bigint, newStatus: number, tx: any = prisma) {
    console.log(`Handling membership updated for ${wallet}, pass ${passId}, status ${newStatus}`);
    await tx.membership.update({
      where: { wallet_passId: { wallet, passId } },
      data: { status: newStatus },
    });
  }

  /**
   * Reverts changes made by a MembershipCreated event.
   */
  async revertMembershipCreated(wallet: string, passId: bigint, tx: any = prisma) {
    console.log(`Reverting membership created for ${wallet}, pass ${passId}`);
    await tx.membership.delete({
      where: { wallet_passId: { wallet, passId } },
    }).catch(() => {});
  }

  /**
   * Reverts changes made by a MembershipUpdated event.
   */
  async revertMembershipUpdated(wallet: string, passId: bigint, tx: any = prisma) {
    console.log(`Reverting membership updated for ${wallet}, pass ${passId}`);
    await tx.membership.update({
      where: { wallet_passId: { wallet, passId } },
      data: { status: 0 }, // Reset to unknown/inactive
    }).catch(() => {});
  }
}
