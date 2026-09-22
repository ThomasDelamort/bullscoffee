import { createEmployee, getAllEmployees, getEmployeeById } from '../providers/employee.provider.ts';
import type { Request, Response } from 'express';
import type { Employee } from '../types/employee.types.ts';

export async function createEmployeeHandler(req: Request, res: Response): Promise<Employee | void> {
    try {
        const employee: Employee = req.body;
        const newEmployee = await createEmployee(employee);
        res.status(201).json(newEmployee);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getAllEmployeesHandler(req: Request, res: Response): Promise<Employee[] | void> {
    try {
        const employees = await getAllEmployees();
        res.status(200).json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getEmployeeByIdHandler(req: Request, res: Response): Promise<Employee | void> {
    try {
        const employee_id = req.params.id;
        const employee = await getEmployeeById(employee_id);
        if (employee) {
            res.status(200).json(employee);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (error) {
        console.error('Error fetching employee by ID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}