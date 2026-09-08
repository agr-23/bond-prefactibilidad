import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const studioRecords=sqliteTable('studio_records',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),name:text('name').notNull(),objectKey:text('object_key').notNull(),byteSize:integer('byte_size').notNull().default(0),revision:integer('revision').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
},t=>[index('idx_studio_owner_kind').on(t.owner,t.kind)]);
