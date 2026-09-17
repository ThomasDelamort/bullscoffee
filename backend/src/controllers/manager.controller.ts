import type { Request, Response } from "express";
import { createManager } from "../providers/manager.provider.ts";

export async function createManagerHandler(req: Request, res: Response) {
  const {
    first_name,
    last_name,
    employee_email,
    contact_number,
    employee_status,
  } = req.body;

  if (
    !first_name ||
    !last_name ||
    !employee_email ||
    !contact_number ||
    !employee_status
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const manager = await createManager({
      first_name,
      last_name,
      employee_email,
      contact_number,
      employee_status,
    });

    return res.status(201).json(manager);
  } catch (err) {
    console.log(`Error ${err}`);
    return res.status(500).json({ error: "Failed to create manager" });
  }
}