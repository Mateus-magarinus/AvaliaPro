import { Schema, Prop } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class MongoAbstractDocument {
  @Prop({ type: SchemaTypes.ObjectId })
  _id?: Types.ObjectId;
}
