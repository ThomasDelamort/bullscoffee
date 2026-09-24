import { createEmployee, getAllEmployees, getEmployeeById, deleteEmployeeById } from '../providers/employee.provider.ts';
import type { Request, Response } from 'express';
import type { Employee } from '../types/employee.types.ts';
import { StatusCodes } from 'http-status-codes';

export async function createEmployeeHandler(req: Request, res: Response): Promise<Employee | void> {
    try {
        const employee: Employee = req.body;
        const newEmployee = await createEmployee(employee);
        res.status(StatusCodes.CREATED).json({ message: "Successfully registered employee", data: newEmployee});
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
}

export async function getAllEmployeesHandler(_req: Request, res: Response): Promise<Employee[] | void> {
    try {
        const employees = await getAllEmployees();
        res.status(StatusCodes.OK).json({ message: "Successfully returned employees", data: employees});
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
}

export async function getEmployeeByIdHandler(req: Request, res: Response): Promise<Employee | void> {
    try {
        const employee_id = Number(req.params['id']);
        if (Number.isNaN(employee_id)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid employee ID' });
            return;
        }
        const employee = await getEmployeeById(employee_id);
        if (employee) {
            res.status(StatusCodes.OK).json({ message: "Employee found", data: employee});
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: 'Employee not found' });
        }
    } catch (error) {
        console.error('Error fetching employee by ID:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
}

export async function deleteEmployeeHandler(req: Request, res: Response): Promise<void> {
    try {
        const employee_id = Number(req.params['id']);
        if (Number.isNaN(employee_id)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid employee ID' });
            return;
        }
        await deleteEmployeeById(employee_id);
        res.status(StatusCodes.OK).json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
}