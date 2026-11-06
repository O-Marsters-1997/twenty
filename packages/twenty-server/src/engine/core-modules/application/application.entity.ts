import { Field, ObjectType } from '@nestjs/graphql';

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { PublicDomainEntity } from 'src/engine/core-modules/public-domain/public-domain.entity';
import { WasIntroducedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-introduced-in-upgrade.decorator';
import { AgentEntity } from 'src/engine/metadata-modules/ai/ai-agent/entities/agent.entity';
import { CommandMenuItemEntity } from 'src/engine/metadata-modules/command-menu-item/entities/command-menu-item.entity';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { RoleDTO } from 'src/engine/metadata-modules/role/dtos/role.dto';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity.type';

@Entity({ name: 'application', schema: 'core' })
@ObjectType('Application')
@Index('IDX_APPLICATION_WORKSPACE_ID', ['workspaceId'])
@Index(
  'IDX_APPLICATION_UNIVERSAL_IDENTIFIER_WORKSPACE_ID_UNIQUE',
  ['universalIdentifier', 'workspaceId'],
  {
    unique: true,
    where: '"deletedAt" IS NULL AND "universalIdentifier" IS NOT NULL',
  },
)
export class ApplicationEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  universalIdentifier: string;

  @Column({ nullable: false, type: 'text' })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ nullable: true, type: 'text' })
  @WasIntroducedInUpgrade({
    upgradeCommandName:
      '2.2.0_AddLogoToApplicationFastInstanceCommand_1777539664664',
  })
  logo: string | null;

  @Column({ nullable: true, type: 'uuid' })
  @WasIntroducedInUpgrade({
    upgradeCommandName:
      '2.19.0_AddLogoFileIdToApplicationFastInstanceCommand_1783062755137',
  })
  logoFileId: string | null;

  @OneToOne(() => FileEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'logoFileId' })
  logoFile: Relation<FileEntity> | null;

  // TODO should not be nullable
  @Column({ nullable: true, type: 'text' })
  version: string | null;

  @Column({ nullable: true, type: 'uuid' })
  defaultRoleId: string | null;

  @Field(() => RoleDTO, { nullable: true })
  defaultRole: RoleDTO | null;

  @Column({ nullable: true, type: 'uuid' })
  @WasIntroducedInUpgrade({
    upgradeCommandName:
      '2.16.0_AddPrimaryPublicDomainToApplicationFastInstanceCommand_1782281874768',
  })
  primaryPublicDomainId: string | null;

  @ManyToOne(() => PublicDomainEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'primaryPublicDomainId' })
  primaryPublicDomain: Relation<PublicDomainEntity> | null;

  @OneToMany(
    () => PublicDomainEntity,
    (publicDomain) => publicDomain.application,
    {
      onDelete: 'SET NULL',
    },
  )
  publicDomains: Relation<PublicDomainEntity[]>;

  @OneToMany(() => AgentEntity, (agent) => agent.application, {
    onDelete: 'CASCADE',
  })
  agents: Relation<AgentEntity[]>;

  @OneToMany(() => ObjectMetadataEntity, (object) => object.application, {
    onDelete: 'CASCADE',
  })
  objects: Relation<ObjectMetadataEntity[]>;

  @OneToMany(
    () => CommandMenuItemEntity,
    (commandMenuItem) => commandMenuItem.application,
    {
      onDelete: 'CASCADE',
    },
  )
  commandMenuItems: Relation<CommandMenuItemEntity[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
