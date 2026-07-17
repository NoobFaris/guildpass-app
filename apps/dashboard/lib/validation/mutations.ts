import type { Member, Pass } from "@/lib/mock-data";

export type FieldValidationError = {
  field: string;
  message: string;
};

type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errors: FieldValidationError[] };

type PassCreateInput = Omit<Pass, "id" | "createdAt">;
type PassUpdateInput = Partial<Omit<Pass, "id" | "createdAt">>;
type MemberCreateInput = Omit<Member, "id">;
type MemberUpdateInput = Partial<Omit<Member, "id">>;

const PASS_STATUSES = ["active", "inactive", "draft"] as const;
const MEMBER_STATUSES = ["active", "inactive", "pending"] as const;
const MEMBER_ROLES = ["admin", "member", "contributor"] as const;
const SERVER_OWNED_FIELDS = ["id", "createdAt"] as const;
const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedValue<T extends readonly string[]>(
  value: unknown,
  allowed: T
): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function validateServerOwnedFields(
  payload: Record<string, unknown>,
  errors: FieldValidationError[]
): void {
  for (const field of SERVER_OWNED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      errors.push({
        field,
        message: `${field} is managed by the server and cannot be provided`,
      });
    }
  }
}

function validateRequiredString(
  payload: Record<string, unknown>,
  field: string,
  errors: FieldValidationError[]
): string | undefined {
  const value = payload[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push({ field, message: `${field} is required` });
    return undefined;
  }

  return value.trim();
}

function validateOptionalString(
  payload: Record<string, unknown>,
  field: string,
  errors: FieldValidationError[]
): string | undefined {
  const value = payload[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push({ field, message: `${field} must be a non-empty string` });
    return undefined;
  }

  return value.trim();
}

function validateOptionalNumber(
  payload: Record<string, unknown>,
  field: string,
  errors: FieldValidationError[],
  options: { integer?: boolean; nullable?: boolean } = {}
): number | null | undefined {
  const value = payload[field];
  if (value === undefined) return undefined;
  if (value === null && options.nullable) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push({ field, message: `${field} must be a number` });
    return undefined;
  }

  if (value < 0) {
    errors.push({ field, message: `${field} must be greater than or equal to 0` });
    return undefined;
  }

  if (options.integer && !Number.isInteger(value)) {
    errors.push({ field, message: `${field} must be an integer` });
    return undefined;
  }

  return value;
}

function validateOptionalDate(
  payload: Record<string, unknown>,
  field: string,
  errors: FieldValidationError[]
): string | undefined {
  const value = payload[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push({ field, message: `${field} must be an ISO date string` });
    return undefined;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    errors.push({ field, message: `${field} must be a valid ISO date string` });
    return undefined;
  }

  return value;
}

function validateRequiredWallet(
  payload: Record<string, unknown>,
  errors: FieldValidationError[]
): string | undefined {
  const wallet = validateRequiredString(payload, "wallet", errors);
  if (!wallet) return undefined;

  if (!WALLET_ADDRESS_PATTERN.test(wallet)) {
    errors.push({
      field: "wallet",
      message: "wallet must be a valid Ethereum address",
    });
    return undefined;
  }

  return wallet;
}

function validateOptionalWallet(
  payload: Record<string, unknown>,
  errors: FieldValidationError[]
): string | undefined {
  const wallet = validateOptionalString(payload, "wallet", errors);
  if (!wallet) return undefined;

  if (!WALLET_ADDRESS_PATTERN.test(wallet)) {
    errors.push({
      field: "wallet",
      message: "wallet must be a valid Ethereum address",
    });
    return undefined;
  }

  return wallet;
}

function validateRoles(
  payload: Record<string, unknown>,
  errors: FieldValidationError[]
): string[] | undefined {
  const value = payload.roles;
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    errors.push({ field: "roles", message: "roles must be an array" });
    return undefined;
  }

  const roles: string[] = [];
  value.forEach((role, index) => {
    if (!isAllowedValue(role, MEMBER_ROLES)) {
      errors.push({
        field: `roles.${index}`,
        message: `role must be one of: ${MEMBER_ROLES.join(", ")}`,
      });
      return;
    }

    roles.push(role);
  });

  return [...new Set(roles)];
}

export function malformedPayloadError(): FieldValidationError[] {
  return [{ field: "body", message: "Request body must be a valid JSON object" }];
}

export function validatePassCreatePayload(payload: unknown): ValidationResult<PassCreateInput> {
  if (!isPlainObject(payload)) {
    return { valid: false, errors: malformedPayloadError() };
  }

  const errors: FieldValidationError[] = [];
  validateServerOwnedFields(payload, errors);

  const name = validateRequiredString(payload, "name", errors);
  const description = validateRequiredString(payload, "description", errors);
  const price = validateOptionalNumber(payload, "price", errors);
  const maxSupply = validateOptionalNumber(payload, "maxSupply", errors, {
    integer: true,
    nullable: true,
  });
  const currentSupply =
    validateOptionalNumber(payload, "currentSupply", errors, { integer: true }) ?? 0;
  const rawStatus = payload.status ?? "draft";

  if (!isAllowedValue(rawStatus, PASS_STATUSES)) {
    errors.push({
      field: "status",
      message: `status must be one of: ${PASS_STATUSES.join(", ")}`,
    });
  }

  if (errors.length > 0 || !name || !description || !isAllowedValue(rawStatus, PASS_STATUSES)) {
    return { valid: false, errors };
  }

  const data: PassCreateInput = {
    name,
    description,
    status: rawStatus,
    currentSupply,
  };

  if (price !== undefined && price !== null) data.price = price;
  if (maxSupply !== undefined) data.maxSupply = maxSupply;

  return {
    valid: true,
    data,
  };
}

export function validatePassUpdatePayload(payload: unknown): ValidationResult<PassUpdateInput> {
  if (!isPlainObject(payload)) {
    return { valid: false, errors: malformedPayloadError() };
  }

  const errors: FieldValidationError[] = [];
  validateServerOwnedFields(payload, errors);

  const data: PassUpdateInput = {};
  const name = validateOptionalString(payload, "name", errors);
  const description = validateOptionalString(payload, "description", errors);
  const price = validateOptionalNumber(payload, "price", errors);
  const maxSupply = validateOptionalNumber(payload, "maxSupply", errors, {
    integer: true,
    nullable: true,
  });
  const currentSupply = validateOptionalNumber(payload, "currentSupply", errors, {
    integer: true,
  });
  const rawStatus = payload.status;

  if (rawStatus !== undefined) {
    if (!isAllowedValue(rawStatus, PASS_STATUSES)) {
      errors.push({
        field: "status",
        message: `status must be one of: ${PASS_STATUSES.join(", ")}`,
      });
    } else {
      data.status = rawStatus;
    }
  }

  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (price !== undefined && price !== null) data.price = price;
  if (maxSupply !== undefined) data.maxSupply = maxSupply;
  if (currentSupply !== undefined && currentSupply !== null) {
    data.currentSupply = currentSupply;
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data };
}

export function validateMemberCreatePayload(payload: unknown): ValidationResult<MemberCreateInput> {
  if (!isPlainObject(payload)) {
    return { valid: false, errors: malformedPayloadError() };
  }

  const errors: FieldValidationError[] = [];
  validateServerOwnedFields(payload, errors);

  const name = validateRequiredString(payload, "name", errors);
  const wallet = validateRequiredWallet(payload, errors);
  const roles = validateRoles(payload, errors) ?? [];
  const rawStatus = payload.status ?? "pending";
  const joinedAt = validateOptionalDate(payload, "joinedAt", errors) ?? new Date().toISOString();
  const lastActive =
    validateOptionalDate(payload, "lastActive", errors) ?? new Date().toISOString();

  if (!isAllowedValue(rawStatus, MEMBER_STATUSES)) {
    errors.push({
      field: "status",
      message: `status must be one of: ${MEMBER_STATUSES.join(", ")}`,
    });
  }

  if (
    errors.length > 0 ||
    !name ||
    !wallet ||
    !isAllowedValue(rawStatus, MEMBER_STATUSES)
  ) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      name,
      wallet,
      status: rawStatus,
      roles,
      joinedAt,
      lastActive,
    },
  };
}

export function validateMemberUpdatePayload(payload: unknown): ValidationResult<MemberUpdateInput> {
  if (!isPlainObject(payload)) {
    return { valid: false, errors: malformedPayloadError() };
  }

  const errors: FieldValidationError[] = [];
  validateServerOwnedFields(payload, errors);

  const data: MemberUpdateInput = {};
  const name = validateOptionalString(payload, "name", errors);
  const wallet = validateOptionalWallet(payload, errors);
  const roles = validateRoles(payload, errors);
  const joinedAt = validateOptionalDate(payload, "joinedAt", errors);
  const lastActive = validateOptionalDate(payload, "lastActive", errors);
  const rawStatus = payload.status;

  if (rawStatus !== undefined) {
    if (!isAllowedValue(rawStatus, MEMBER_STATUSES)) {
      errors.push({
        field: "status",
        message: `status must be one of: ${MEMBER_STATUSES.join(", ")}`,
      });
    } else {
      data.status = rawStatus;
    }
  }

  if (name !== undefined) data.name = name;
  if (wallet !== undefined) data.wallet = wallet;
  if (roles !== undefined) data.roles = roles;
  if (joinedAt !== undefined) data.joinedAt = joinedAt;
  if (lastActive !== undefined) data.lastActive = lastActive;

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data };
}
