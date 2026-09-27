/**
 * Real-world contact details, shared by the Contact section and the footer
 * so the two never drift apart. Update the shop's info here only.
 */

export const CONTACT_ADDRESS = ["NU Cebu SM City Kaohsiung St", "Cebu City, 6000 Cebu"];

export const CONTACT_EMAIL = "sup@bullscoffee.com";

export const CONTACT_PHONE = {
  label: "(555) 012-3456",
  href: "tel:+15550123456",
};

export interface ContactHours {
  days: string;
  time: string;
}

/** Shown in the "Hours" card, in order. */
export const CONTACT_HOURS: readonly ContactHours[] = [
  { days: "Monday – Friday", time: "7:00 AM – 8:00 PM" },
  { days: "Saturday", time: "8:00 AM – 5:00 PM" },
  { days: "Sunday", time: "Closed" },
];
