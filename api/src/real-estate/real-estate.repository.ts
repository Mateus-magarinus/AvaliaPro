import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
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
    filter: QueryFilter<RealEstateDocument>,
  ): Promise<SimpleDeleteResult> {
    return this.model.deleteMany(filter).exec();
  }

  async listAllIds(): Promise<number[]> {
    const docs = await this.model.find({}, { ID: 1, _id: 0 }).lean().exec();
    return docs.map((d) => d.ID);
  }

  /**
   * Agrega cidades distintas (com UF) e os bairros de cada uma a partir do
   * catálogo MongoDB. Agrupa por cidade normalizada (lowercase + trim) para
   * evitar duplicatas por diferença de caixa.
   */
  async aggregateLocations(): Promise<
    Array<{ uf: string; city: string; bairros: string[] }>
  > {
    const rows = await this.model
      .aggregate([
        { $match: { Cidade: { $type: 'string', $ne: '' } } },
        {
          $group: {
            _id: {
              uf: { $toUpper: { $ifNull: ['$UF', ''] } },
              cityKey: { $toLower: { $trim: { input: '$Cidade' } } },
            },
            city: { $first: '$Cidade' },
            bairros: { $addToSet: '$Bairro' },
          },
        },
        { $sort: { city: 1 } },
      ])
      .exec();

    return rows.map((r: any) => ({
      uf: String(r?._id?.uf ?? '').trim(),
      city: String(r?.city ?? '').trim(),
      bairros: Array.isArray(r?.bairros) ? r.bairros : [],
    }));
  }
}
