import {Company, User} from "@/models/user";
import {GetUserResponse} from "@/utils/api";

function formatAddress(
  street: string | null,
  number: string | null,
  neighborhood: string | null,
  city: string | null,
  state: string | null,
  zip: string | null,
): string {
  const parts: string[] = [];

  // Street and number
  if (street || number) {
    parts.push(`${street || ""} ${number || ""}`.trim());
  }

  // Neighborhood
  if (neighborhood) {
    parts.push(`${parts.length ? "-" : ""} ${neighborhood}`);
  }

  // City and state
  if (city || state) {
    parts.push(
      `${city || ""}${city && state ? " -" : ""} ${state || ""}`.trim(),
    );
  }

  // ZIP code
  if (zip) {
    parts.push(zip);
  }

  return parts.join(", ").trim();
}

export function getFormattedAddress(user?: User): string {
  if (!user) return "-";
  return formatAddress(
    user.addr_street,
    user.addr_number,
    user.addr_county, // Using addr_county as neighborhood
    user.addr_city,
    user.addr_state,
    user.addr_zip,
  );
}

function getFormattedAltCompanyAddress(user?: User): string {
  if (!user) return "-";
  return formatAddress(
    user.alt_company_addr_street,
    user.alt_company_addr_number,
    user.alt_company_addr_county, // Using alt_company_addr_county as neighborhood
    user.alt_company_addr_city,
    user.alt_company_addr_state,
    user.alt_company_addr_zip,
  );
}

function getFormattedCompanyAddress(company?: Company): string {
  if (!company) return "-";
  return formatAddress(
    company.addr_street,
    company.addr_number,
    company.addr_county,
    company.addr_city,
    company.addr_state,
    company.addr_zip,
  );
}

export function getTheFormattedCompanyAddress(userData?: GetUserResponse): string {
  if (!userData) return "-";
  return userData?.user.uses_alt_company_addr
    ? getFormattedAltCompanyAddress(userData?.user)
    : getFormattedCompanyAddress(userData?.companies[0]);
}
