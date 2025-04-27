import { Logger, NotFoundException } from '@nestjs/common';
import { MongoAbstractDocument } from './mongo_abstract.schema';
import {
  FilterQuery,
  HydratedDocument,
  Model,
  Types,
  UpdateQuery,
} from 'mongoose';

export abstract class MongoAbstractRepository<
  TDocument extends MongoAbstractDocument,
> {
  protected abstract readonly logger: Logger;

  constructor(protected readonly model: Model<TDocument>) {}

  async findAll(filterQuery: FilterQuery<TDocument>): Promise<TDocument[]> {
    return this.model.find(filterQuery).lean<TDocument[]>(true);
  }

  async findOne(filterQuery: FilterQuery<TDocument>): Promise<TDocument> {
    const document = await this.model
      .findOne(filterQuery)
      .lean<TDocument>(true);
    if (!document) {
      this.logger.warn('Document was not found with filterQuery', filterQuery);
      throw new NotFoundException('Document was not found');
    }

    return document;
  }

  async create(document: Omit<TDocument, '_id'>): Promise<TDocument> {
    const createdDocument = new this.model({
      ...document,
      _id: new Types.ObjectId(),
    });
    return (await createdDocument.save()).toJSON() as unknown as TDocument;
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
  ): Promise<TDocument> {
    const document = await this.model
      .findOneAndUpdate(filterQuery, update, { new: true })
      .lean<TDocument>(true);

    if (!document) {
      this.logger.warn('Document was not found with filterQuery', filterQuery);
      throw new NotFoundException('Document was not found');
    }

    return document;
  }

  async findOneAndUpsert(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
  ): Promise<TDocument> {
    const document = await this.model
      .findOneAndUpdate(filterQuery, update, { new: true, upsert: true })
      .lean<TDocument>(true);

    return document;
  }

  async findOneAndDelete(
    filterQuery: FilterQuery<TDocument>,
  ): Promise<TDocument> {
    const document = await this.model
      .findOneAndDelete(filterQuery)
      .lean<TDocument>(true);

    if (!document) {
      this.logger.warn('Document was not found with filterQuery', filterQuery);
      throw new NotFoundException('Document was not found');
    }

    return document;
  }

  async insertMany(documents: Omit<TDocument, '_id'>[]): Promise<TDocument[]> {
    const result = (await this.model.insertMany(
      documents,
    )) as HydratedDocument<TDocument>[];

    return result.map((doc) => doc.toObject() as TDocument);
  }

  async updateManyCustom(
    updates: {
      filter: FilterQuery<TDocument>;
      update: UpdateQuery<TDocument>;
    }[],
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    await Promise.all(
      updates.map(async (u) => {
        await this.model.updateOne(u.filter, u.update).exec();
      }),
    );
  }
}
