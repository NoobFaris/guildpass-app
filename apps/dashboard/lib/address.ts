import { getAddress } from "viem";

export function isValidChecksumAddress(addr: string): boolean {
  try {
    const checksummed = getAddress(addr);
    return checksummed === addr;
  } catch {
    return false;
  }
}

export function normaliseAddress(addr: string): string {
  // getAddress will throw for invalid addresses and returns the checksummed address
  return getAddress(addr);
}

export default {
  isValidChecksumAddress,
  normaliseAddress,
};
