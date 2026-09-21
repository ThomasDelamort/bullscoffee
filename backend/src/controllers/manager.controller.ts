import type { Request, Response } from "express";
import { createManager, getAllManagers, getManagerById } from "../providers/manager.provider.ts";

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

export async function getAllManagersHandler(req: Request, res: Response) {
  try {
    const managers = await getAllManagers();
    return res.status(200).json(managers);
  } catch (err) {
    console.log(`Error ${err}`);
    return res.status(500).json({ error: "Failed to fetch managers" });
  }
}

export async function getManagerByIdHandler(req: Request, res: Response) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Missing manager ID" });
  }

  try {
    const manager = await getManagerById(Number(id));
    if (!manager) {
      return res.status(404).json({ error: "Manager not found" });
    }
    return res.status(200).json(manager);
  } catch (err) {
    console.log(`Error ${err}`);
    return res.status(500).json({ error: "Failed to fetch manager" });
  }
}
