import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { MongoAbstractRepository, RealEstateDocument } from '@common';

type SimpleDeleteResult = { acknowledged?: boolean; deletedCount?: number };

@Injectable()
export class RealEstateRepository extends MongoAbstractRepository<RealEstateDocument> {
  protected readonly logger = new Logger(RealEstateRepository.name);

  constructor(
    @InjectModel(RealEstateDocument.name)
    RealEstateDocument: Model<RealEstateDocument>,
  ) {
    super(RealEstateDocument);
  }

  async deleteMany(
    filter: FilterQuery<RealEstateDocument>,
  ): Promise<SimpleDeleteResult> {
    return this.model.deleteMany(filter).exec();
  }

  async listAllIds(): Promise<number[]> {
    const docs = await this.model.find({}, { ID: 1, _id: 0 }).lean().exec();
    return docs.map((d) => d.ID);
  }
}
