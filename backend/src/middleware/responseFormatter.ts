import type { Request, Response, NextFunction } from "express";

interface responseDTO {
    status: "success" | "error",
    statusCode: number,
    error: any,
    message: string,
    data: any
}

function responseFormatter(_req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json.bind(res);

    res.json = (data: responseDTO) => {
        const safeValue = data ?? {};

        return originalJson({
            status:
                res.statusCode >= 200 && res.statusCode < 300 
                    ? "success" 
                    : "error",
                statusCode: res.statusCode,
                error: safeValue.error,
                message: data.message ?? "",
                data: safeValue.data ?? {},
        });
    };
    next();
}

export default responseFormatter;