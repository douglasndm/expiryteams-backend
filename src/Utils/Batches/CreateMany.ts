import { defaultDataSource } from '@project/ormconfig';

import Batch from '@models/Batch';

async function createManyBatches(batches: Batch[]): Promise<Batch[]> {
    const repository = defaultDataSource.getRepository(Batch);
    const createdBatches = await repository.save(batches);

    return createdBatches;
}

export { createManyBatches };
