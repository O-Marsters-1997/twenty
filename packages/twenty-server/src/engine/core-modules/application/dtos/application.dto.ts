import { Field, ObjectType } from '@nestjs/graphql';

import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { AgentDTO } from 'src/engine/metadata-modules/ai/ai-agent/dtos/agent.dto';
import { CommandMenuItemDTO } from 'src/engine/metadata-modules/command-menu-item/dtos/command-menu-item.dto';
import { ObjectMetadataDTO } from 'src/engine/metadata-modules/object-metadata/dtos/object-metadata.dto';
import { RoleDTO } from 'src/engine/metadata-modules/role/dtos/role.dto';

@ObjectType('Application')
export class ApplicationDTO {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  id: string;

  @IsString()
  @Field()
  name: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  description?: string;

  // Package-relative path of the logo bundled in the application, not
  // displayable on its own: exposed to clients through the logoUrl field
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsUUID()
  @Field(() => UUIDScalarType, { nullable: true })
  logoFileId?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  version?: string;

  @IsString()
  @Field()
  universalIdentifier: string;

  @IsDateString()
  @Field()
  createdAt: Date;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  defaultRoleId?: string;

  @IsOptional()
  @Field(() => RoleDTO, { nullable: true })
  defaultLogicFunctionRole?: RoleDTO;

  @Field(() => [AgentDTO])
  agents?: AgentDTO[];

  @Field(() => [CommandMenuItemDTO])
  commandMenuItems?: CommandMenuItemDTO[];

  @Field(() => [ObjectMetadataDTO])
  objects?: ObjectMetadataDTO[];
}
