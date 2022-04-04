import { getRepository } from 'typeorm';

import Cache from '@services/Cache';

import { getAllBrands } from '@utils/Brand';
import { getUserStoreOnTeam } from '@utils/Stores/Team';
import { getUserRoleInTeam } from '@utils/UserRoles';
import { getAllStoresFromTeam } from '@utils/Stores/List';

import { checkIfProductAlreadyExists } from '@functions/Products';
import { sortBatchesByExpDate } from '@functions/Batches';

import Product from '@models/Product';
import Category from '@models/Category';
import Batch from '@models/Batch';
import Team from '@models/Team';
import Store from '@models/Store';
import ProductCategory from '@models/ProductCategory';
import ProductTeams from '@models/ProductTeams';

import AppError from '@errors/AppError';
import { addToCategory } from '@utils/Product/Category/AddToCategory';

interface getProductProps {
    product_id: string;
    team_id?: string;
}

export async function getProduct({
    product_id,
    team_id,
}: getProductProps): Promise<Product> {
    const cache = new Cache();
    // We use team id cause when product is in a category and user remove it ou add it into a category
    // all products with that team id will be removed from cache
    if (team_id) {
        const cachedProd = await cache.get<Product>(
            `product:${team_id}:${product_id}`,
        );

        if (cachedProd) {
            return cachedProd;
        }
    }

    const reposity = getRepository(Product);

    const product = await reposity
        .createQueryBuilder('product')
        .where('product.id = :product_id', { product_id })
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.store', 'store')
        .leftJoinAndSelect('product.categories', 'categories')
        .leftJoinAndSelect('product.batches', 'batches')
        .leftJoinAndSelect('categories.category', 'category')
        .getOne();

    if (!product) {
        throw new AppError({
            message: 'Product not found',
            internalErrorCode: 8,
        });
    }

    const categories: Array<ProductCategory> = [];

    product.categories.forEach(cat => categories.push(cat));

    let batches: Array<Batch> = [];

    if (product?.batches) {
        batches = sortBatchesByExpDate(product.batches);
    }

    const organizedProduct = {
        ...product,
        categories,
        batches,
    };

    if (team_id) {
        await cache.save(`product:${team_id}:${product_id}`, organizedProduct);
    }

    return organizedProduct;
}

interface createProductProps {
    name: string;
    code?: string;
    brand?: string;
    team_id: string;
    user_id: string;
    store_id?: string;
    categories?: Array<string>;
}

export async function createProduct({
    name,
    code,
    brand,
    team_id,
    store_id,
    user_id,
    categories,
}: createProductProps): Promise<Product> {
    const productAlreadyExists = await checkIfProductAlreadyExists({
        name,
        code,
        team_id,
    });

    if (productAlreadyExists) {
        throw new AppError({
            message: 'This product already exists. Try add a new batch',
            statusCode: 400,
            internalErrorCode: 11,
        });
    }

    const repository = getRepository(Product);
    const teamRepository = getRepository(Team);
    const productTeamRepository = getRepository(ProductTeams);

    const team = await teamRepository.findOne(team_id);

    if (!team) {
        throw new AppError({
            message: 'Team was not found',
            statusCode: 400,
            internalErrorCode: 6,
        });
    }

    const userRoleOnTeam = await getUserRoleInTeam({ user_id, team_id });

    let userStore: Store | undefined;

    if (userRoleOnTeam === 'manager' && store_id) {
        const stores = await getAllStoresFromTeam({ team_id });

        const store = stores.find(sto => sto.id === store_id);

        if (store) {
            userStore = store;
        }
    } else {
        const uStore = await getUserStoreOnTeam({ team_id, user_id });

        if (uStore?.store) {
            userStore = uStore.store;
        }
    }

    const allBrands = await getAllBrands({ team_id });
    const findedBrand = allBrands.find(b => b.id === brand);

    const prod: Product = new Product();
    prod.name = name;
    prod.code = code || null;
    prod.brand = findedBrand;

    if (userStore) {
        prod.store = userStore;
    }

    const savedProd = await repository.save(prod);

    const productTeam = new ProductTeams();
    productTeam.product = savedProd;
    productTeam.team = team;

    await productTeamRepository.save(productTeam);

    if (!!categories && categories.length > 0) {
        const categoryRepository = getRepository(Category);
        const category = await categoryRepository.findOne({
            where: {
                id: categories[0],
            },
        });

        if (!category) {
            throw new AppError({
                message: 'Category was not found',
                statusCode: 400,
                internalErrorCode: 10,
            });
        }

        await addToCategory({
            product_id: prod.id,
            category_id: category.id,
        });
    }

    const cache = new Cache();
    await cache.invalidade(`products-from-teams:${team_id}`);

    return savedProd;
}
