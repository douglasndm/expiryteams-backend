import { defaultDataSource } from '@services/TypeORM';

import { invalidadeCache } from '@services/Cache/Redis';

import Brand from '@models/Brand';

import { getAllBrands } from '@utils/Brand';
import { getTeamById } from '@utils/Team/Find';

interface createManyBrandsProps {
    brands_names: Array<string>;
    team_id: string;
}

async function createManyBrands(
    props: createManyBrandsProps,
): Promise<Brand[]> {
    const { brands_names, team_id } = props;

    const brandsFromTeam = await getAllBrands({ team_id });
    const brandsToCreate = brands_names.filter(brand => {
        const exists = brandsFromTeam.find(
            b => b.name.toLowerCase() === brand.toLowerCase(),
        );

        if (exists) {
            return false;
        }

        return true;
    });

    const team = await getTeamById(team_id);

    const brands = brandsToCreate.map(bName => {
        const brand = new Brand();
        brand.name = bName;
        brand.team = team;

        return brand;
    });

    const repository = defaultDataSource.getRepository(Brand);
    const createdBrands = await repository.save(brands);

    await invalidadeCache(`team_brands:${team_id}`);

    return createdBrands;
}

export { createManyBrands };
