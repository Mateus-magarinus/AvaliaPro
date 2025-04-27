import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoAbstractRepository, RealEstateDocument } from '@common';

@Injectable()
export class RealEstateRepository extends MongoAbstractRepository<RealEstateDocument> {
  protected readonly logger = new Logger(RealEstateRepository.name);

  constructor(
    @InjectModel(RealEstateDocument.name)
    RealEstateDocument: Model<RealEstateDocument>,
  ) {
    super(RealEstateDocument);
  }
}
