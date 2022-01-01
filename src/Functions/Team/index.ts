import { getRepository } from 'typeorm';
import { compareAsc, startOfDay } from 'date-fns';

import Team from '@models/Team';

import { getTeamSubscription } from '@utils/Subscription';

import AppError from '@errors/AppError';

import { isUserManager } from '@functions/Users/UserRoles';
import { getAllUsersFromTeam } from './Users';
import { deleteAllProducts } from './Products';

interface getTeamProps {
    team_id: string;
}

export async function getTeam({ team_id }: getTeamProps): Promise<Team> {
    const teamRepository = getRepository(Team);
    const team = await teamRepository.findOne(team_id);

    if (!team) {
        throw new AppError({
            message: 'Team not found',
            internalErrorCode: 6,
        });
    }

    return team;
}

interface checkIfTeamIsActiveProps {
    team_id: string;
}

export async function checkIfTeamIsActive({
    team_id,
}: checkIfTeamIsActiveProps): Promise<boolean> {
    const today = startOfDay(new Date());

    const subscriptions = await getTeamSubscription(team_id);

    if (!subscriptions) {
        return false;
    }

    const date = startOfDay(subscriptions.expireIn);

    if (compareAsc(today, date) <= 0) {
        return true;
    }

    return false;
}

interface checkMembersLimitProps {
    team_id: string;
}

interface checkMembersLimitResponse {
    limit: number;
    members: number;
}

export async function checkMembersLimit({
    team_id,
}: checkMembersLimitProps): Promise<checkMembersLimitResponse> {
    const sub = await getTeamSubscription(team_id);

    if (!sub) {
        throw new AppError({
            message: "Team doesn't have any subscription",
            statusCode: 400,
            internalErrorCode: 5,
        });
    }

    if (compareAsc(startOfDay(new Date()), startOfDay(sub.expireIn)) <= 0) {
        const users = await getAllUsersFromTeam({ team_id });

        return {
            limit: sub.membersLimit,
            members: users.length,
        };
    }

    throw new AppError({
        message: 'Subscription is expired',
        statusCode: 400,
        internalErrorCode: 5,
    });
}

interface deleteTeamProps {
    team_id: string;
    user_id: string;
}

export async function deleteTeam({
    team_id,
    user_id,
}: deleteTeamProps): Promise<void> {
    const isManager = await isUserManager({ user_id, team_id });

    if (!isManager) {
        throw new AppError({
            message: "You don't have permission to do that",
            statusCode: 401,
            internalErrorCode: 2,
        });
    }

    const teamRepository = getRepository(Team);
    const team = await teamRepository.findOne(team_id);

    if (!team) {
        throw new AppError({
            message: 'Team was not found',
            statusCode: 400,
            internalErrorCode: 6,
        });
    }

    await deleteAllProducts({ team_id });

    await teamRepository.remove(team);
}
