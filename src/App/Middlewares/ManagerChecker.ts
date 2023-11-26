import { Request, Response, NextFunction } from 'express';

import { getUserRole } from '@utils/Team/Roles/Find';
import { getUserByFirebaseId } from '@utils/User/Find';

import AppError from '@errors/AppError';

async function CheckIfUserIsManager(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    if (!req.userId) {
        throw new AppError({
            message: '',
            statusCode: 401,
            internalErrorCode: 2,
        });
    }

    const { team_id } = req.params;

    const user = await getUserByFirebaseId(req.userId);
    const role = await getUserRole({ team_id, user_id: user.id });

    if (role.role.toLocaleLowerCase() !== 'manager') {
        throw new AppError({
            message: '',
            statusCode: 401,
            internalErrorCode: 2,
        });
    }

    return next();
}

export default CheckIfUserIsManager;
