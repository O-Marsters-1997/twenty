import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('WorkspaceUrls')
export class WorkspaceUrlsDTO {
  @Field(() => String)
  subdomainUrl: string;
}
