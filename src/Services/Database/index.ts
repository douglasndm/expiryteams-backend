import { createConnection, getConnectionOptions } from 'typeorm';

import { Batch } from '../../App/Models/Batch';
import { Category } from '../../App/Models/Category';
import { Product } from '../../App/Models/Product';
import { Team } from '../../App/Models/Team';
import { User } from '../../App/Models/User';
import UserRoles from '../../App/Models/UserRoles';

async function setConnection(): Promise<void> {
    const defaultOptions = await getConnectionOptions();

    createConnection(
        Object.assign(defaultOptions, {
            entities: [Batch, Category, Product, Team, User, UserRoles],
        }),
    );
}

setConnection();
