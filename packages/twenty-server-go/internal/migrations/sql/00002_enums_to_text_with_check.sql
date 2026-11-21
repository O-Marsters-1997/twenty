-- +goose Up
-- +goose StatementBegin
ALTER TABLE core."file" DROP CONSTRAINT "CHK_FILE_PENDING_MIME_OCTET_STREAM";
ALTER TABLE core."view" DROP CONSTRAINT "CHK_VIEW_CALENDAR_INTEGRITY";
ALTER TABLE core."navigationMenuItem" DROP CONSTRAINT "CHK_navigation_menu_item_type_fields";
ALTER TABLE core."workspace" DROP CONSTRAINT "onboarded_workspace_requires_default_role";
ALTER TABLE core."workspace" DROP CONSTRAINT "workspace_requires_database_schema";
DROP INDEX core."IDX_MESSAGE_CHANNEL_APP_CONNECTED_ACCOUNT_HANDLE_UNIQUE";
DROP INDEX core."IDX_WORKFLOW_VERSION_ONE_ACTIVE_PER_WORKFLOW";

-- core.calendarChannel.syncStatus
ALTER TABLE core."calendarChannel" ALTER COLUMN "syncStatus" DROP DEFAULT;
ALTER TABLE core."calendarChannel" ALTER COLUMN "syncStatus" TYPE text USING "syncStatus"::text;
ALTER TABLE core."calendarChannel" ALTER COLUMN "syncStatus" SET DEFAULT 'NOT_SYNCED'::text;
ALTER TABLE core."calendarChannel" ADD CONSTRAINT "calendarChannel_syncstatus_check" CHECK ("syncStatus" IN ('NOT_SYNCED', 'ONGOING', 'ACTIVE', 'FAILED_INSUFFICIENT_PERMISSIONS', 'FAILED_UNKNOWN'));
-- core.calendarChannel.syncStage
ALTER TABLE core."calendarChannel" ALTER COLUMN "syncStage" TYPE text USING "syncStage"::text;
ALTER TABLE core."calendarChannel" ADD CONSTRAINT "calendarChannel_syncstage_check" CHECK ("syncStage" IN ('PENDING_CONFIGURATION', 'CALENDAR_EVENT_LIST_FETCH_PENDING', 'CALENDAR_EVENT_LIST_FETCH_SCHEDULED', 'CALENDAR_EVENT_LIST_FETCH_ONGOING', 'CALENDAR_EVENTS_IMPORT_PENDING', 'CALENDAR_EVENTS_IMPORT_SCHEDULED', 'CALENDAR_EVENTS_IMPORT_ONGOING', 'FAILED'));
-- core.calendarChannel.visibility
ALTER TABLE core."calendarChannel" ALTER COLUMN "visibility" TYPE text USING "visibility"::text;
ALTER TABLE core."calendarChannel" ADD CONSTRAINT "calendarChannel_visibility_check" CHECK ("visibility" IN ('METADATA', 'SHARE_EVERYTHING'));
-- core.calendarChannel.contactAutoCreationPolicy
ALTER TABLE core."calendarChannel" ALTER COLUMN "contactAutoCreationPolicy" DROP DEFAULT;
ALTER TABLE core."calendarChannel" ALTER COLUMN "contactAutoCreationPolicy" TYPE text USING "contactAutoCreationPolicy"::text;
ALTER TABLE core."calendarChannel" ALTER COLUMN "contactAutoCreationPolicy" SET DEFAULT 'AS_PARTICIPANT_AND_ORGANIZER'::text;
ALTER TABLE core."calendarChannel" ADD CONSTRAINT "calendarChannel_contactautocreationpolicy_check" CHECK ("contactAutoCreationPolicy" IN ('AS_PARTICIPANT_AND_ORGANIZER', 'AS_PARTICIPANT', 'AS_ORGANIZER', 'NONE'));
-- core.calendarChannel.webhookSubscriptionStatus
ALTER TABLE core."calendarChannel" ALTER COLUMN "webhookSubscriptionStatus" TYPE text USING "webhookSubscriptionStatus"::text;
ALTER TABLE core."calendarChannel" ADD CONSTRAINT "calendarChannel_webhooksubscriptionstatus_check" CHECK ("webhookSubscriptionStatus" IN ('PENDING', 'ACTIVE', 'FAILED', 'EXPIRED'));
-- core.commandMenuItem.availabilityType
ALTER TABLE core."commandMenuItem" ALTER COLUMN "availabilityType" DROP DEFAULT;
ALTER TABLE core."commandMenuItem" ALTER COLUMN "availabilityType" TYPE text USING "availabilityType"::text;
ALTER TABLE core."commandMenuItem" ALTER COLUMN "availabilityType" SET DEFAULT 'GLOBAL'::text;
ALTER TABLE core."commandMenuItem" ADD CONSTRAINT "commandMenuItem_availabilitytype_check" CHECK ("availabilityType" IN ('GLOBAL', 'GLOBAL_OBJECT_CONTEXT', 'RECORD_SELECTION', 'FALLBACK'));
-- core.dataSource.type
ALTER TABLE core."dataSource" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."dataSource" ALTER COLUMN "type" TYPE text USING "type"::text;
ALTER TABLE core."dataSource" ALTER COLUMN "type" SET DEFAULT 'postgres'::text;
ALTER TABLE core."dataSource" ADD CONSTRAINT "dataSource_type_check" CHECK ("type" IN ('postgres'));
-- core.dpaAgreement.type
ALTER TABLE core."dpaAgreement" ALTER COLUMN "type" TYPE text USING "type"::text;
ALTER TABLE core."dpaAgreement" ADD CONSTRAINT "dpaAgreement_type_check" CHECK ("type" IN ('CLICK_THROUGH', 'SIGNED'));
-- core.emailingDomain.status
ALTER TABLE core."emailingDomain" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE core."emailingDomain" ALTER COLUMN "status" TYPE text USING "status"::text;
ALTER TABLE core."emailingDomain" ALTER COLUMN "status" SET DEFAULT 'PENDING'::text;
ALTER TABLE core."emailingDomain" ADD CONSTRAINT "emailingDomain_status_check" CHECK ("status" IN ('PENDING', 'VERIFIED', 'FAILED', 'TEMPORARY_FAILURE'));
-- core.emailingDomain.tenantStatus
ALTER TABLE core."emailingDomain" ALTER COLUMN "tenantStatus" DROP DEFAULT;
ALTER TABLE core."emailingDomain" ALTER COLUMN "tenantStatus" TYPE text USING "tenantStatus"::text;
ALTER TABLE core."emailingDomain" ALTER COLUMN "tenantStatus" SET DEFAULT 'ACTIVE'::text;
ALTER TABLE core."emailingDomain" ADD CONSTRAINT "emailingDomain_tenantstatus_check" CHECK ("tenantStatus" IN ('ACTIVE', 'PAUSED', 'SANDBOX'));
-- core.emailingDomain.unsubscribeHostnameStatus
ALTER TABLE core."emailingDomain" ALTER COLUMN "unsubscribeHostnameStatus" TYPE text USING "unsubscribeHostnameStatus"::text;
ALTER TABLE core."emailingDomain" ADD CONSTRAINT "emailingDomain_unsubscribehostnamestatus_check" CHECK ("unsubscribeHostnameStatus" IN ('PENDING', 'ACTIVE', 'FAILED'));
-- core.fieldMetadata.writability
ALTER TABLE core."fieldMetadata" ALTER COLUMN "writability" DROP DEFAULT;
ALTER TABLE core."fieldMetadata" ALTER COLUMN "writability" TYPE text USING "writability"::text;
ALTER TABLE core."fieldMetadata" ALTER COLUMN "writability" SET DEFAULT 'OPEN'::text;
ALTER TABLE core."fieldMetadata" ADD CONSTRAINT "fieldMetadata_writability_check" CHECK ("writability" IN ('OPEN', 'APPLICATION', 'SYSTEM'));
-- core.file.status
ALTER TABLE core."file" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE core."file" ALTER COLUMN "status" TYPE text USING "status"::text;
ALTER TABLE core."file" ALTER COLUMN "status" SET DEFAULT 'UPLOADED'::text;
ALTER TABLE core."file" ADD CONSTRAINT "file_status_check" CHECK ("status" IN ('PENDING', 'UPLOADED'));
-- core.indexMetadata.indexType
ALTER TABLE core."indexMetadata" ALTER COLUMN "indexType" DROP DEFAULT;
ALTER TABLE core."indexMetadata" ALTER COLUMN "indexType" TYPE text USING "indexType"::text;
ALTER TABLE core."indexMetadata" ALTER COLUMN "indexType" SET DEFAULT 'BTREE'::text;
ALTER TABLE core."indexMetadata" ADD CONSTRAINT "indexMetadata_indextype_check" CHECK ("indexType" IN ('BTREE', 'GIN'));
-- core.keyValuePair.type
ALTER TABLE core."keyValuePair" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."keyValuePair" ALTER COLUMN "type" TYPE text USING "type"::text;
ALTER TABLE core."keyValuePair" ALTER COLUMN "type" SET DEFAULT 'USER_VARIABLE'::text;
ALTER TABLE core."keyValuePair" ADD CONSTRAINT "keyValuePair_type_check" CHECK ("type" IN ('USER_VARIABLE', 'FEATURE_FLAG', 'CONFIG_VARIABLE', 'APPLICATION_VARIABLE'));
-- core.messageChannel.visibility
ALTER TABLE core."messageChannel" ALTER COLUMN "visibility" TYPE text USING "visibility"::text;
ALTER TABLE core."messageChannel" ADD CONSTRAINT "messageChannel_visibility_check" CHECK ("visibility" IN ('METADATA', 'SUBJECT', 'SHARE_EVERYTHING'));
-- core.messageChannel.type
ALTER TABLE core."messageChannel" ALTER COLUMN "type" TYPE text USING "type"::text;
ALTER TABLE core."messageChannel" ADD CONSTRAINT "messageChannel_type_check" CHECK ("type" IN ('EMAIL', 'SMS', 'EMAIL_GROUP', 'APP'));
-- core.messageChannel.contactAutoCreationPolicy
ALTER TABLE core."messageChannel" ALTER COLUMN "contactAutoCreationPolicy" DROP DEFAULT;
ALTER TABLE core."messageChannel" ALTER COLUMN "contactAutoCreationPolicy" TYPE text USING "contactAutoCreationPolicy"::text;
ALTER TABLE core."messageChannel" ALTER COLUMN "contactAutoCreationPolicy" SET DEFAULT 'SENT'::text;
ALTER TABLE core."messageChannel" ADD CONSTRAINT "messageChannel_contactautocreationpolicy_check" CHECK ("contactAutoCreationPolicy" IN ('SENT_AND_RECEIVED', 'SENT', 'NONE'));
-- core.messageChannel.messageFolderImportPolicy
ALTER TABLE core."messageChannel" ALTER COLUMN "messageFolderImportPolicy" DROP DEFAULT;
ALTER TABLE core."messageChannel" ALTER COLUMN "messageFolderImportPolicy" TYPE text USING "messageFolderImportPolicy"::text;
ALTER TABLE core."messageChannel" ALTER COLUMN "messageFolderImportPolicy" SET DEFAULT 'ALL_FOLDERS'::text;
ALTER TABLE core."messageChannel" ADD CONSTRAINT "messageChannel_messagefolderimportpolicy_check" CHECK ("messageFolderImportPolicy" IN ('ALL_FOLDERS', 'SELECTED_FOLDERS'));
-- core.messageChannel.pendingGroupEmailsAction
ALTER TABLE core."messageChannel" ALTER COLUMN "pendingGroupEmailsAction" TYPE text USING "pendingGroupEmailsAction"::text;
ALTER TABLE core."messageChannel" ADD CONSTRAINT "messageChannel_pendinggroupemailsaction_check" CHECK ("pendingGroupEmailsAction" IN ('GROUP_EMAILS_DELETION', 'GROUP_EMAILS_IMPORT', 'NONE'));
-- core.messageChannel.syncStatus
ALTER TABLE core."messageChannel" ALTER COLUMN "syncStatus" DROP DEFAULT;
ALTER TABLE core."messageChannel" ALTER COLUMN "syncStatus" TYPE text USING "syncStatus"::text;
ALTER TABLE core."messageChannel" ALTER COLUMN "syncStatus" SET DEFAULT 'NOT_SYNCED'::text;
ALTER TABLE core."messageChannel" ADD CONSTRAINT "messageChannel_syncstatus_check" CHECK ("syncStatus" IN ('NOT_SYNCED', 'ONGOING', 'ACTIVE', 'FAILED_INSUFFICIENT_PERMISSIONS', 'FAILED_UNKNOWN'));
-- core.messageChannel.syncStage
ALTER TABLE core."messageChannel" ALTER COLUMN "syncStage" TYPE text USING "syncStage"::text;
ALTER TABLE core."messageChannel" ADD CONSTRAINT "messageChannel_syncstage_check" CHECK ("syncStage" IN ('PENDING_CONFIGURATION', 'MESSAGE_LIST_FETCH_PENDING', 'MESSAGE_LIST_FETCH_SCHEDULED', 'MESSAGE_LIST_FETCH_ONGOING', 'MESSAGES_IMPORT_PENDING', 'MESSAGES_IMPORT_SCHEDULED', 'MESSAGES_IMPORT_ONGOING', 'FAILED'));
-- core.messageChannel.webhookSubscriptionStatus
ALTER TABLE core."messageChannel" ALTER COLUMN "webhookSubscriptionStatus" TYPE text USING "webhookSubscriptionStatus"::text;
ALTER TABLE core."messageChannel" ADD CONSTRAINT "messageChannel_webhooksubscriptionstatus_check" CHECK ("webhookSubscriptionStatus" IN ('PENDING', 'ACTIVE', 'FAILED', 'EXPIRED'));
-- core.messageFolder.pendingSyncAction
ALTER TABLE core."messageFolder" ALTER COLUMN "pendingSyncAction" DROP DEFAULT;
ALTER TABLE core."messageFolder" ALTER COLUMN "pendingSyncAction" TYPE text USING "pendingSyncAction"::text;
ALTER TABLE core."messageFolder" ALTER COLUMN "pendingSyncAction" SET DEFAULT 'NONE'::text;
ALTER TABLE core."messageFolder" ADD CONSTRAINT "messageFolder_pendingsyncaction_check" CHECK ("pendingSyncAction" IN ('FOLDER_DELETION', 'FOLDER_IMPORT', 'NONE'));
-- core.navigationMenuItem.type
ALTER TABLE core."navigationMenuItem" ALTER COLUMN "type" TYPE text USING "type"::text;
ALTER TABLE core."navigationMenuItem" ADD CONSTRAINT "navigationMenuItem_type_check" CHECK ("type" IN ('VIEW', 'FOLDER', 'LINK', 'OBJECT', 'RECORD', 'PAGE_LAYOUT'));
-- core.objectMetadata.openRecordIn
ALTER TABLE core."objectMetadata" ALTER COLUMN "openRecordIn" DROP DEFAULT;
ALTER TABLE core."objectMetadata" ALTER COLUMN "openRecordIn" TYPE text USING "openRecordIn"::text;
ALTER TABLE core."objectMetadata" ALTER COLUMN "openRecordIn" SET DEFAULT 'USER_CHOICE'::text;
ALTER TABLE core."objectMetadata" ADD CONSTRAINT "objectMetadata_openrecordin_check" CHECK ("openRecordIn" IN ('SIDE_PANEL', 'RECORD_PAGE', 'USER_CHOICE'));
-- core.objectMetadata.writability
ALTER TABLE core."objectMetadata" ALTER COLUMN "writability" DROP DEFAULT;
ALTER TABLE core."objectMetadata" ALTER COLUMN "writability" TYPE text USING "writability"::text;
ALTER TABLE core."objectMetadata" ALTER COLUMN "writability" SET DEFAULT 'OPEN'::text;
ALTER TABLE core."objectMetadata" ADD CONSTRAINT "objectMetadata_writability_check" CHECK ("writability" IN ('OPEN', 'APPLICATION', 'SYSTEM'));
-- core.objectMetadata.readability
ALTER TABLE core."objectMetadata" ALTER COLUMN "readability" DROP DEFAULT;
ALTER TABLE core."objectMetadata" ALTER COLUMN "readability" TYPE text USING "readability"::text;
ALTER TABLE core."objectMetadata" ALTER COLUMN "readability" SET DEFAULT 'OPEN'::text;
ALTER TABLE core."objectMetadata" ADD CONSTRAINT "objectMetadata_readability_check" CHECK ("readability" IN ('OPEN', 'PRIVATE', 'INHERITED', 'APPLICATION', 'SYSTEM'));
-- core.objectMetadata.sharingReach
ALTER TABLE core."objectMetadata" ALTER COLUMN "sharingReach" DROP DEFAULT;
ALTER TABLE core."objectMetadata" ALTER COLUMN "sharingReach" TYPE text USING "sharingReach"::text;
ALTER TABLE core."objectMetadata" ALTER COLUMN "sharingReach" SET DEFAULT 'WORKSPACE'::text;
ALTER TABLE core."objectMetadata" ADD CONSTRAINT "objectMetadata_sharingreach_check" CHECK ("sharingReach" IN ('ROLE_ACCESS', 'WORKSPACE'));
-- core.pageLayout.type
ALTER TABLE core."pageLayout" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."pageLayout" ALTER COLUMN "type" TYPE text USING "type"::text;
ALTER TABLE core."pageLayout" ALTER COLUMN "type" SET DEFAULT 'RECORD_PAGE'::text;
ALTER TABLE core."pageLayout" ADD CONSTRAINT "pageLayout_type_check" CHECK ("type" IN ('RECORD_INDEX', 'RECORD_PAGE', 'DASHBOARD', 'STANDALONE_PAGE', 'RECORD_FORM'));
-- core.pageLayoutTab.layoutMode
ALTER TABLE core."pageLayoutTab" ALTER COLUMN "layoutMode" DROP DEFAULT;
ALTER TABLE core."pageLayoutTab" ALTER COLUMN "layoutMode" TYPE text USING "layoutMode"::text;
ALTER TABLE core."pageLayoutTab" ALTER COLUMN "layoutMode" SET DEFAULT 'GRID'::text;
ALTER TABLE core."pageLayoutTab" ADD CONSTRAINT "pageLayoutTab_layoutmode_check" CHECK ("layoutMode" IN ('GRID', 'VERTICAL_LIST', 'CANVAS'));
-- core.pageLayoutWidget.type
ALTER TABLE core."pageLayoutWidget" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."pageLayoutWidget" ALTER COLUMN "type" TYPE text USING "type"::text;
ALTER TABLE core."pageLayoutWidget" ALTER COLUMN "type" SET DEFAULT 'VIEW'::text;
ALTER TABLE core."pageLayoutWidget" ADD CONSTRAINT "pageLayoutWidget_type_check" CHECK ("type" IN ('VIEW', 'IFRAME', 'FIELD', 'FIELDS', 'GRAPH', 'STANDALONE_RICH_TEXT', 'TIMELINE', 'TASKS', 'NOTES', 'FILES', 'EMAILS', 'CALENDAR', 'FIELD_RICH_TEXT', 'WORKFLOW', 'WORKFLOW_VERSION', 'WORKFLOW_RUN', 'RECORD_TABLE', 'EMAIL_THREAD', 'CALL_RECORDING_SUMMARY', 'CALL_RECORDING_TRANSCRIPT', 'MESSAGE_CAMPAIGN_BODY', 'MESSAGE_CAMPAIGN_DETAILS', 'FORM_FIELD', 'CHAT_THREADS', 'CHAT'));
-- core.rowLevelPermissionPredicate.operand
ALTER TABLE core."rowLevelPermissionPredicate" ALTER COLUMN "operand" DROP DEFAULT;
ALTER TABLE core."rowLevelPermissionPredicate" ALTER COLUMN "operand" TYPE text USING "operand"::text;
ALTER TABLE core."rowLevelPermissionPredicate" ALTER COLUMN "operand" SET DEFAULT 'CONTAINS'::text;
ALTER TABLE core."rowLevelPermissionPredicate" ADD CONSTRAINT "rowLevelPermissionPredicate_operand_check" CHECK ("operand" IN ('IS', 'IS_NOT_NULL', 'IS_NOT', 'LESS_THAN_OR_EQUAL', 'GREATER_THAN_OR_EQUAL', 'IS_BEFORE', 'IS_AFTER', 'CONTAINS', 'DOES_NOT_CONTAIN', 'IS_EMPTY', 'IS_NOT_EMPTY', 'IS_RELATIVE', 'IS_IN_PAST', 'IS_IN_FUTURE', 'IS_TODAY', 'VECTOR_SEARCH'));
-- core.rowLevelPermissionPredicateGroup.logicalOperator
ALTER TABLE core."rowLevelPermissionPredicateGroup" ALTER COLUMN "logicalOperator" DROP DEFAULT;
ALTER TABLE core."rowLevelPermissionPredicateGroup" ALTER COLUMN "logicalOperator" TYPE text USING "logicalOperator"::text;
ALTER TABLE core."rowLevelPermissionPredicateGroup" ALTER COLUMN "logicalOperator" SET DEFAULT 'AND'::text;
ALTER TABLE core."rowLevelPermissionPredicateGroup" ADD CONSTRAINT "rowLevelPermissionPredicateGroup_logicaloperator_check" CHECK ("logicalOperator" IN ('AND', 'OR'));
-- core.twoFactorAuthenticationMethod.status
ALTER TABLE core."twoFactorAuthenticationMethod" ALTER COLUMN "status" TYPE text USING "status"::text;
ALTER TABLE core."twoFactorAuthenticationMethod" ADD CONSTRAINT "twoFactorAuthenticationMethod_status_check" CHECK ("status" IN ('PENDING', 'VERIFIED'));
-- core.twoFactorAuthenticationMethod.strategy
ALTER TABLE core."twoFactorAuthenticationMethod" ALTER COLUMN "strategy" TYPE text USING "strategy"::text;
ALTER TABLE core."twoFactorAuthenticationMethod" ADD CONSTRAINT "twoFactorAuthenticationMethod_strategy_check" CHECK ("strategy" IN ('TOTP'));
-- core.unsubscribeTopic.visibility
ALTER TABLE core."unsubscribeTopic" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE core."unsubscribeTopic" ALTER COLUMN "visibility" TYPE text USING "visibility"::text;
ALTER TABLE core."unsubscribeTopic" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE'::text;
ALTER TABLE core."unsubscribeTopic" ADD CONSTRAINT "unsubscribeTopic_visibility_check" CHECK ("visibility" IN ('PUBLIC', 'PRIVATE'));
-- core.view.type
ALTER TABLE core."view" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."view" ALTER COLUMN "type" TYPE text USING "type"::text;
ALTER TABLE core."view" ALTER COLUMN "type" SET DEFAULT 'TABLE'::text;
ALTER TABLE core."view" ADD CONSTRAINT "view_type_check" CHECK ("type" IN ('TABLE', 'KANBAN', 'CALENDAR', 'LIST', 'FIELDS_WIDGET', 'TABLE_WIDGET', 'KANBAN_WIDGET', 'LIST_WIDGET', 'CALENDAR_WIDGET'));
-- core.view.key
ALTER TABLE core."view" ALTER COLUMN "key" TYPE text USING "key"::text;
ALTER TABLE core."view" ADD CONSTRAINT "view_key_check" CHECK ("key" IN ('INDEX'));
-- core.view.openRecordIn
ALTER TABLE core."view" ALTER COLUMN "openRecordIn" DROP DEFAULT;
ALTER TABLE core."view" ALTER COLUMN "openRecordIn" TYPE text USING "openRecordIn"::text;
ALTER TABLE core."view" ALTER COLUMN "openRecordIn" SET DEFAULT 'SIDE_PANEL'::text;
ALTER TABLE core."view" ADD CONSTRAINT "view_openrecordin_check" CHECK ("openRecordIn" IN ('SIDE_PANEL', 'RECORD_PAGE'));
-- core.view.kanbanAggregateOperation
ALTER TABLE core."view" ALTER COLUMN "kanbanAggregateOperation" TYPE text USING "kanbanAggregateOperation"::text;
ALTER TABLE core."view" ADD CONSTRAINT "view_kanbanaggregateoperation_check" CHECK ("kanbanAggregateOperation" IN ('MIN', 'MAX', 'AVG', 'SUM', 'COUNT', 'COUNT_UNIQUE_VALUES', 'COUNT_EMPTY', 'COUNT_NOT_EMPTY', 'COUNT_TRUE', 'COUNT_FALSE', 'PERCENTAGE_EMPTY', 'PERCENTAGE_NOT_EMPTY'));
-- core.view.calendarLayout
ALTER TABLE core."view" ALTER COLUMN "calendarLayout" TYPE text USING "calendarLayout"::text;
ALTER TABLE core."view" ADD CONSTRAINT "view_calendarlayout_check" CHECK ("calendarLayout" IN ('DAY', 'WEEK', 'MONTH'));
-- core.view.visibility
ALTER TABLE core."view" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE core."view" ALTER COLUMN "visibility" TYPE text USING "visibility"::text;
ALTER TABLE core."view" ALTER COLUMN "visibility" SET DEFAULT 'WORKSPACE'::text;
ALTER TABLE core."view" ADD CONSTRAINT "view_visibility_check" CHECK ("visibility" IN ('WORKSPACE', 'UNLISTED'));
-- core.viewField.aggregateOperation
ALTER TABLE core."viewField" ALTER COLUMN "aggregateOperation" TYPE text USING "aggregateOperation"::text;
ALTER TABLE core."viewField" ADD CONSTRAINT "viewField_aggregateoperation_check" CHECK ("aggregateOperation" IN ('MIN', 'MAX', 'AVG', 'SUM', 'COUNT', 'COUNT_UNIQUE_VALUES', 'COUNT_EMPTY', 'COUNT_NOT_EMPTY', 'COUNT_TRUE', 'COUNT_FALSE', 'PERCENTAGE_EMPTY', 'PERCENTAGE_NOT_EMPTY'));
-- core.viewFilter.operand
ALTER TABLE core."viewFilter" ALTER COLUMN "operand" DROP DEFAULT;
ALTER TABLE core."viewFilter" ALTER COLUMN "operand" TYPE text USING "operand"::text;
ALTER TABLE core."viewFilter" ALTER COLUMN "operand" SET DEFAULT 'CONTAINS'::text;
ALTER TABLE core."viewFilter" ADD CONSTRAINT "viewFilter_operand_check" CHECK ("operand" IN ('IS', 'IS_NOT_NULL', 'IS_NOT', 'LESS_THAN_OR_EQUAL', 'GREATER_THAN_OR_EQUAL', 'IS_BEFORE', 'IS_AFTER', 'CONTAINS', 'DOES_NOT_CONTAIN', 'IS_EMPTY', 'IS_NOT_EMPTY', 'IS_RELATIVE', 'IS_IN_PAST', 'IS_IN_FUTURE', 'IS_TODAY', 'VECTOR_SEARCH'));
-- core.viewFilterGroup.logicalOperator
ALTER TABLE core."viewFilterGroup" ALTER COLUMN "logicalOperator" DROP DEFAULT;
ALTER TABLE core."viewFilterGroup" ALTER COLUMN "logicalOperator" TYPE text USING "logicalOperator"::text;
ALTER TABLE core."viewFilterGroup" ALTER COLUMN "logicalOperator" SET DEFAULT 'AND'::text;
ALTER TABLE core."viewFilterGroup" ADD CONSTRAINT "viewFilterGroup_logicaloperator_check" CHECK ("logicalOperator" IN ('AND', 'OR', 'NOT'));
-- core.viewSort.direction
ALTER TABLE core."viewSort" ALTER COLUMN "direction" DROP DEFAULT;
ALTER TABLE core."viewSort" ALTER COLUMN "direction" TYPE text USING "direction"::text;
ALTER TABLE core."viewSort" ALTER COLUMN "direction" SET DEFAULT 'ASC'::text;
ALTER TABLE core."viewSort" ADD CONSTRAINT "viewSort_direction_check" CHECK ("direction" IN ('ASC', 'DESC'));
-- core.workflowVersion.status
ALTER TABLE core."workflowVersion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE core."workflowVersion" ALTER COLUMN "status" TYPE text USING "status"::text;
ALTER TABLE core."workflowVersion" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;
ALTER TABLE core."workflowVersion" ADD CONSTRAINT "workflowVersion_status_check" CHECK ("status" IN ('DRAFT', 'ACTIVE', 'DEACTIVATED', 'ARCHIVED'));
-- core.workspace.activationStatus
ALTER TABLE core."workspace" ALTER COLUMN "activationStatus" DROP DEFAULT;
ALTER TABLE core."workspace" ALTER COLUMN "activationStatus" TYPE text USING "activationStatus"::text;
ALTER TABLE core."workspace" ALTER COLUMN "activationStatus" SET DEFAULT 'INACTIVE'::text;
ALTER TABLE core."workspace" ADD CONSTRAINT "workspace_activationStatus_check" CHECK ("activationStatus" IN ('ONGOING_CREATION', 'PENDING_CREATION', 'CREATED', 'ACTIVE', 'INACTIVE'));
-- core.workspace.workspaceDiscoverability
ALTER TABLE core."workspace" ALTER COLUMN "workspaceDiscoverability" DROP DEFAULT;
ALTER TABLE core."workspace" ALTER COLUMN "workspaceDiscoverability" TYPE text USING "workspaceDiscoverability"::text;
ALTER TABLE core."workspace" ALTER COLUMN "workspaceDiscoverability" SET DEFAULT 'PUBLIC'::text;
ALTER TABLE core."workspace" ADD CONSTRAINT "workspace_discoverability_check" CHECK ("workspaceDiscoverability" IN ('PUBLIC', 'MEMBERS_AND_INVITEES', 'HIDDEN'));
-- workspace_2abogkkt2zd45pa9aun09djpf.agentTurn.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn" ALTER COLUMN "createdBySource" SET DEFAULT 'SYSTEM'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn" ADD CONSTRAINT "agentTurn_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.attachment.fileCategory
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "fileCategory" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "fileCategory" TYPE text USING "fileCategory"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "fileCategory" SET DEFAULT 'OTHER'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ADD CONSTRAINT "attachment_fileCategory_check" CHECK ("fileCategory" IN ('ARCHIVE', 'AUDIO', 'IMAGE', 'PRESENTATION', 'SPREADSHEET', 'TEXT_DOCUMENT', 'VIDEO', 'OTHER'));
-- workspace_2abogkkt2zd45pa9aun09djpf.attachment.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ADD CONSTRAINT "attachment_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.attachment.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ADD CONSTRAINT "attachment_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.blocklist.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ADD CONSTRAINT "blocklist_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.blocklist.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ADD CONSTRAINT "blocklist_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.blocklist.scope
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "scope" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "scope" TYPE text USING "scope"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "scope" SET DEFAULT 'WORKSPACE_MEMBER'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ADD CONSTRAINT "blocklist_scope_check" CHECK ("scope" IN ('WORKSPACE_MEMBER', 'WORKSPACE'));
-- workspace_2abogkkt2zd45pa9aun09djpf.calendarChannelEventAssociation.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ADD CONSTRAINT "calendarChannelEventAssociation_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.calendarChannelEventAssociation.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ADD CONSTRAINT "calendarChannelEventAssociation_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.calendarEvent.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ADD CONSTRAINT "calendarEvent_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.calendarEvent.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ADD CONSTRAINT "calendarEvent_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.calendarEventParticipant.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ADD CONSTRAINT "calendarEventParticipant_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.calendarEventParticipant.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ADD CONSTRAINT "calendarEventParticipant_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.calendarEventParticipant.responseStatus
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "responseStatus" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "responseStatus" TYPE text USING "responseStatus"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "responseStatus" SET DEFAULT 'NEEDS_ACTION'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ADD CONSTRAINT "calendarEventParticipant_responseStatus_check" CHECK ("responseStatus" IN ('NEEDS_ACTION', 'DECLINED', 'TENTATIVE', 'ACCEPTED'));
-- workspace_2abogkkt2zd45pa9aun09djpf.calendarEventTarget.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ADD CONSTRAINT "calendarEventTarget_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.calendarEventTarget.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ADD CONSTRAINT "calendarEventTarget_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.company.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ADD CONSTRAINT "company_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.company.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ADD CONSTRAINT "company_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.dashboard.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ADD CONSTRAINT "dashboard_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.dashboard.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ADD CONSTRAINT "dashboard_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.message.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ADD CONSTRAINT "message_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.message.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ADD CONSTRAINT "message_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageCampaign.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ADD CONSTRAINT "messageCampaign_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageCampaign.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ADD CONSTRAINT "messageCampaign_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageCampaign.status
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "status" TYPE text USING "status"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ADD CONSTRAINT "messageCampaign_status_check" CHECK ("status" IN ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'SENT_WITH_ERRORS', 'CANCELED'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageChannelMessageAssociation.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ADD CONSTRAINT "messageChannelMessageAssociation_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageChannelMessageAssociation.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ADD CONSTRAINT "messageChannelMessageAssociation_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageChannelMessageAssociation.direction
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "direction" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "direction" TYPE text USING "direction"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "direction" SET DEFAULT 'INCOMING'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ADD CONSTRAINT "messageChannelMessageAssociation_direction_check" CHECK ("direction" IN ('INCOMING', 'OUTGOING'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageChannelMessageAssociationMessageFolder.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ADD CONSTRAINT "messageChannelMessageAssociationMessageFolder_createdBySource_c" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageChannelMessageAssociationMessageFolder.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ADD CONSTRAINT "messageChannelMessageAssociationMessageFolder_updatedBySource_c" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageList.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ADD CONSTRAINT "messageList_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageList.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ADD CONSTRAINT "messageList_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageListMember.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ADD CONSTRAINT "messageListMember_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageListMember.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ADD CONSTRAINT "messageListMember_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageParticipant.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ADD CONSTRAINT "messageParticipant_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageParticipant.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ADD CONSTRAINT "messageParticipant_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageParticipant.role
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "role" TYPE text USING "role"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "role" SET DEFAULT 'FROM'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ADD CONSTRAINT "messageParticipant_role_check" CHECK ("role" IN ('FROM', 'TO', 'CC', 'BCC', 'REPLY_TO'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageThread.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ADD CONSTRAINT "messageThread_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageThread.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ADD CONSTRAINT "messageThread_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageThreadTarget.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ADD CONSTRAINT "messageThreadTarget_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.messageThreadTarget.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ADD CONSTRAINT "messageThreadTarget_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.note.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ADD CONSTRAINT "note_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.note.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ADD CONSTRAINT "note_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.noteTarget.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ADD CONSTRAINT "noteTarget_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.noteTarget.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ADD CONSTRAINT "noteTarget_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.opportunity.stage
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "stage" TYPE text USING "stage"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "stage" SET DEFAULT 'NEW'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ADD CONSTRAINT "opportunity_stage_check" CHECK ("stage" IN ('NEW', 'SCREENING', 'MEETING', 'PROPOSAL', 'CUSTOMER'));
-- workspace_2abogkkt2zd45pa9aun09djpf.opportunity.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ADD CONSTRAINT "opportunity_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.opportunity.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ADD CONSTRAINT "opportunity_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.person.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ADD CONSTRAINT "person_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.person.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ADD CONSTRAINT "person_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.recordShare.principalType
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "principalType" TYPE text USING "principalType"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ADD CONSTRAINT "recordShare_principalType_check" CHECK ("principalType" IN ('EVERYONE', 'WORKSPACE_MEMBER', 'ROLE'));
-- workspace_2abogkkt2zd45pa9aun09djpf.recordShare.accessLevel
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "accessLevel" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "accessLevel" TYPE text USING "accessLevel"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "accessLevel" SET DEFAULT 'READ'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ADD CONSTRAINT "recordShare_accessLevel_check" CHECK ("accessLevel" IN ('READ', 'READ_WRITE', 'FULL', 'NONE'));
-- workspace_2abogkkt2zd45pa9aun09djpf.recordShare.rowCause
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "rowCause" TYPE text USING "rowCause"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ADD CONSTRAINT "recordShare_rowCause_check" CHECK ("rowCause" IN ('OWNER', 'MANUAL', 'RULE', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.recordShare.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ADD CONSTRAINT "recordShare_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.recordShare.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ADD CONSTRAINT "recordShare_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.shortLink.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ADD CONSTRAINT "shortLink_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.shortLink.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ADD CONSTRAINT "shortLink_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.task.status
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "status" TYPE text USING "status"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "status" SET DEFAULT 'TODO'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ADD CONSTRAINT "task_status_check" CHECK ("status" IN ('TODO', 'IN_PROGRESS', 'DONE'));
-- workspace_2abogkkt2zd45pa9aun09djpf.task.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ADD CONSTRAINT "task_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.task.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ADD CONSTRAINT "task_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.taskTarget.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ADD CONSTRAINT "taskTarget_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.taskTarget.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ADD CONSTRAINT "taskTarget_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.timelineActivity.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ADD CONSTRAINT "timelineActivity_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.timelineActivity.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ADD CONSTRAINT "timelineActivity_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflow.statuses
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "statuses" TYPE text[] USING "statuses"::text[];
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ADD CONSTRAINT "workflow_statuses_check" CHECK ("statuses" <@ ARRAY['DRAFT', 'ACTIVE', 'DEACTIVATED']::text[]);
-- workspace_2abogkkt2zd45pa9aun09djpf.workflow.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ADD CONSTRAINT "workflow_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflow.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ADD CONSTRAINT "workflow_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflowAutomatedTrigger.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ADD CONSTRAINT "workflowAutomatedTrigger_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflowAutomatedTrigger.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ADD CONSTRAINT "workflowAutomatedTrigger_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflowAutomatedTrigger.type
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "type" TYPE text USING "type"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "type" SET DEFAULT 'DATABASE_EVENT'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ADD CONSTRAINT "workflowAutomatedTrigger_type_check" CHECK ("type" IN ('DATABASE_EVENT', 'CRON'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflowRun.status
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "status" TYPE text USING "status"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ADD CONSTRAINT "workflowRun_status_check" CHECK ("status" IN ('NOT_STARTED', 'RUNNING', 'COMPLETED', 'FAILED', 'ENQUEUED', 'STOPPING', 'STOPPED'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflowRun.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ADD CONSTRAINT "workflowRun_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflowRun.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ADD CONSTRAINT "workflowRun_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflowVersion.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ADD CONSTRAINT "workflowVersion_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflowVersion.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ADD CONSTRAINT "workflowVersion_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workflowVersion.status
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "status" TYPE text USING "status"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ADD CONSTRAINT "workflowVersion_status_check" CHECK ("status" IN ('DRAFT', 'ACTIVE', 'DEACTIVATED', 'ARCHIVED'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workspaceMember.dateFormat
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "dateFormat" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "dateFormat" TYPE text USING "dateFormat"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "dateFormat" SET DEFAULT 'SYSTEM'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ADD CONSTRAINT "workspaceMember_dateFormat_check" CHECK ("dateFormat" IN ('SYSTEM', 'MONTH_FIRST', 'DAY_FIRST', 'YEAR_FIRST'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workspaceMember.timeFormat
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "timeFormat" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "timeFormat" TYPE text USING "timeFormat"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "timeFormat" SET DEFAULT 'SYSTEM'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ADD CONSTRAINT "workspaceMember_timeFormat_check" CHECK ("timeFormat" IN ('SYSTEM', 'HOUR_24', 'HOUR_12'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workspaceMember.numberFormat
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "numberFormat" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "numberFormat" TYPE text USING "numberFormat"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "numberFormat" SET DEFAULT 'SYSTEM'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ADD CONSTRAINT "workspaceMember_numberFormat_check" CHECK ("numberFormat" IN ('SYSTEM', 'COMMAS_AND_DOT', 'SPACES_AND_COMMA', 'DOTS_AND_COMMA', 'APOSTROPHE_AND_DOT'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workspaceMember.createdBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "createdBySource" TYPE text USING "createdBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ADD CONSTRAINT "workspaceMember_createdBySource_check" CHECK ("createdBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));
-- workspace_2abogkkt2zd45pa9aun09djpf.workspaceMember.updatedBySource
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "updatedBySource" TYPE text USING "updatedBySource"::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::text;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ADD CONSTRAINT "workspaceMember_updatedBySource_check" CHECK ("updatedBySource" IN ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION'));

ALTER TABLE core."file" ADD CONSTRAINT "CHK_FILE_PENDING_MIME_OCTET_STREAM" CHECK (((status <> 'PENDING'::text) OR (("mimeType")::text = 'application/octet-stream'::text))) NOT VALID;
ALTER TABLE core."view" ADD CONSTRAINT "CHK_VIEW_CALENDAR_INTEGRITY" CHECK (((type <> ALL (ARRAY['CALENDAR'::text, 'CALENDAR_WIDGET'::text])) OR (("calendarLayout" IS NOT NULL) AND ("calendarFieldMetadataId" IS NOT NULL))));
ALTER TABLE core."navigationMenuItem" ADD CONSTRAINT "CHK_navigation_menu_item_type_fields" CHECK (((type = 'FOLDER'::text) OR ((type = 'OBJECT'::text) AND ("targetObjectMetadataId" IS NOT NULL)) OR ((type = 'VIEW'::text) AND ("viewId" IS NOT NULL)) OR ((type = 'RECORD'::text) AND ("targetRecordId" IS NOT NULL) AND ("targetObjectMetadataId" IS NOT NULL)) OR ((type = 'LINK'::text) AND (link IS NOT NULL)) OR ((type = 'PAGE_LAYOUT'::text) AND ("pageLayoutId" IS NOT NULL))));
ALTER TABLE core."workspace" ADD CONSTRAINT "onboarded_workspace_requires_default_role" CHECK ((("activationStatus" = ANY (ARRAY['PENDING_CREATION'::text, 'ONGOING_CREATION'::text])) OR ("defaultRoleId" IS NOT NULL)));
ALTER TABLE core."workspace" ADD CONSTRAINT "workspace_requires_database_schema" CHECK ((("activationStatus" = ANY (ARRAY['PENDING_CREATION'::text, 'ONGOING_CREATION'::text])) OR (("databaseSchema" IS NOT NULL) AND (("databaseSchema")::text <> ''::text))));
CREATE UNIQUE INDEX "IDX_MESSAGE_CHANNEL_APP_CONNECTED_ACCOUNT_HANDLE_UNIQUE" ON core."messageChannel" USING btree ("workspaceId", "connectedAccountId", handle) WHERE (type = 'APP'::text);
CREATE UNIQUE INDEX "IDX_WORKFLOW_VERSION_ONE_ACTIVE_PER_WORKFLOW" ON core."workflowVersion" USING btree ("workspaceId", "coreWorkflowId") WHERE (status = 'ACTIVE'::text);

DROP TYPE core."calendarChannel_contactautocreationpolicy_enum";
DROP TYPE core."calendarChannel_syncstage_enum";
DROP TYPE core."calendarChannel_syncstatus_enum";
DROP TYPE core."calendarChannel_visibility_enum";
DROP TYPE core."calendarChannel_webhooksubscriptionstatus_enum";
DROP TYPE core."commandMenuItem_availabilitytype_enum";
DROP TYPE core."dataSource_type_enum";
DROP TYPE core."dpaAgreement_type_enum";
DROP TYPE core."emailingDomain_status_enum";
DROP TYPE core."emailingDomain_tenantstatus_enum";
DROP TYPE core."emailingDomain_unsubscribehostnamestatus_enum";
DROP TYPE core."fieldMetadata_writability_enum";
DROP TYPE core."file_status_enum";
DROP TYPE core."indexMetadata_indextype_enum";
DROP TYPE core."keyValuePair_type_enum";
DROP TYPE core."messageChannel_contactautocreationpolicy_enum";
DROP TYPE core."messageChannel_messagefolderimportpolicy_enum";
DROP TYPE core."messageChannel_pendinggroupemailsaction_enum";
DROP TYPE core."messageChannel_syncstage_enum";
DROP TYPE core."messageChannel_syncstatus_enum";
DROP TYPE core."messageChannel_type_enum";
DROP TYPE core."messageChannel_visibility_enum";
DROP TYPE core."messageChannel_webhooksubscriptionstatus_enum";
DROP TYPE core."messageFolder_pendingsyncaction_enum";
DROP TYPE core."navigationMenuItem_type_enum";
DROP TYPE core."objectMetadata_openrecordin_enum";
DROP TYPE core."objectMetadata_readability_enum";
DROP TYPE core."objectMetadata_sharingreach_enum";
DROP TYPE core."objectMetadata_writability_enum";
DROP TYPE core."pageLayoutTab_layoutmode_enum";
DROP TYPE core."pageLayoutWidget_type_enum";
DROP TYPE core."pageLayout_type_enum";
DROP TYPE core."routeTrigger_httpmethod_enum";
DROP TYPE core."rowLevelPermissionPredicateGroup_logicaloperator_enum";
DROP TYPE core."rowLevelPermissionPredicate_operand_enum";
DROP TYPE core."twoFactorAuthenticationMethod_status_enum";
DROP TYPE core."twoFactorAuthenticationMethod_strategy_enum";
DROP TYPE core."unsubscribeTopic_visibility_enum";
DROP TYPE core."viewField_aggregateoperation_enum";
DROP TYPE core."viewFilterGroup_logicaloperator_enum";
DROP TYPE core."viewFilter_operand_enum";
DROP TYPE core."viewSort_direction_enum";
DROP TYPE core."view_calendarlayout_enum";
DROP TYPE core."view_kanbanaggregateoperation_enum";
DROP TYPE core."view_key_enum";
DROP TYPE core."view_openrecordin_enum";
DROP TYPE core."view_type_enum";
DROP TYPE core."view_visibility_enum";
DROP TYPE core."workflowVersion_status_enum";
DROP TYPE core."workspace_activationStatus_enum";
DROP TYPE core."workspace_discoverability_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."attachment_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."attachment_fileCategory_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."attachment_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."blocklist_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."blocklist_scope_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."blocklist_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_responseStatus_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."company_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."company_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."dashboard_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."dashboard_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_status_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_createdBySource_e";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_updatedBySource_e";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_direction_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageList_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageList_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_role_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThread_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThread_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."message_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."message_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."note_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."note_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."opportunity_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."opportunity_stage_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."opportunity_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."person_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."person_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_accessLevel_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_principalType_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_rowCause_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."shortLink_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."shortLink_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."task_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."task_status_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."task_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_type_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_status_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_status_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflow_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflow_statuses_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflow_updatedBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_createdBySource_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_dateFormat_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_numberFormat_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_timeFormat_enum";
DROP TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_updatedBySource_enum";
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
CREATE TYPE core."calendarChannel_contactautocreationpolicy_enum" AS ENUM ('AS_PARTICIPANT_AND_ORGANIZER', 'AS_PARTICIPANT', 'AS_ORGANIZER', 'NONE');
CREATE TYPE core."calendarChannel_syncstage_enum" AS ENUM ('PENDING_CONFIGURATION', 'CALENDAR_EVENT_LIST_FETCH_PENDING', 'CALENDAR_EVENT_LIST_FETCH_SCHEDULED', 'CALENDAR_EVENT_LIST_FETCH_ONGOING', 'CALENDAR_EVENTS_IMPORT_PENDING', 'CALENDAR_EVENTS_IMPORT_SCHEDULED', 'CALENDAR_EVENTS_IMPORT_ONGOING', 'FAILED');
CREATE TYPE core."calendarChannel_syncstatus_enum" AS ENUM ('NOT_SYNCED', 'ONGOING', 'ACTIVE', 'FAILED_INSUFFICIENT_PERMISSIONS', 'FAILED_UNKNOWN');
CREATE TYPE core."calendarChannel_visibility_enum" AS ENUM ('METADATA', 'SHARE_EVERYTHING');
CREATE TYPE core."calendarChannel_webhooksubscriptionstatus_enum" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'EXPIRED');
CREATE TYPE core."commandMenuItem_availabilitytype_enum" AS ENUM ('GLOBAL', 'GLOBAL_OBJECT_CONTEXT', 'RECORD_SELECTION', 'FALLBACK');
CREATE TYPE core."dataSource_type_enum" AS ENUM ('postgres');
CREATE TYPE core."dpaAgreement_type_enum" AS ENUM ('CLICK_THROUGH', 'SIGNED');
CREATE TYPE core."emailingDomain_status_enum" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'TEMPORARY_FAILURE');
CREATE TYPE core."emailingDomain_tenantstatus_enum" AS ENUM ('ACTIVE', 'PAUSED', 'SANDBOX');
CREATE TYPE core."emailingDomain_unsubscribehostnamestatus_enum" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');
CREATE TYPE core."fieldMetadata_writability_enum" AS ENUM ('OPEN', 'APPLICATION', 'SYSTEM');
CREATE TYPE core."file_status_enum" AS ENUM ('PENDING', 'UPLOADED');
CREATE TYPE core."indexMetadata_indextype_enum" AS ENUM ('BTREE', 'GIN');
CREATE TYPE core."keyValuePair_type_enum" AS ENUM ('USER_VARIABLE', 'FEATURE_FLAG', 'CONFIG_VARIABLE', 'APPLICATION_VARIABLE');
CREATE TYPE core."messageChannel_contactautocreationpolicy_enum" AS ENUM ('SENT_AND_RECEIVED', 'SENT', 'NONE');
CREATE TYPE core."messageChannel_messagefolderimportpolicy_enum" AS ENUM ('ALL_FOLDERS', 'SELECTED_FOLDERS');
CREATE TYPE core."messageChannel_pendinggroupemailsaction_enum" AS ENUM ('GROUP_EMAILS_DELETION', 'GROUP_EMAILS_IMPORT', 'NONE');
CREATE TYPE core."messageChannel_syncstage_enum" AS ENUM ('PENDING_CONFIGURATION', 'MESSAGE_LIST_FETCH_PENDING', 'MESSAGE_LIST_FETCH_SCHEDULED', 'MESSAGE_LIST_FETCH_ONGOING', 'MESSAGES_IMPORT_PENDING', 'MESSAGES_IMPORT_SCHEDULED', 'MESSAGES_IMPORT_ONGOING', 'FAILED');
CREATE TYPE core."messageChannel_syncstatus_enum" AS ENUM ('NOT_SYNCED', 'ONGOING', 'ACTIVE', 'FAILED_INSUFFICIENT_PERMISSIONS', 'FAILED_UNKNOWN');
CREATE TYPE core."messageChannel_type_enum" AS ENUM ('EMAIL', 'SMS', 'EMAIL_GROUP', 'APP');
CREATE TYPE core."messageChannel_visibility_enum" AS ENUM ('METADATA', 'SUBJECT', 'SHARE_EVERYTHING');
CREATE TYPE core."messageChannel_webhooksubscriptionstatus_enum" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'EXPIRED');
CREATE TYPE core."messageFolder_pendingsyncaction_enum" AS ENUM ('FOLDER_DELETION', 'FOLDER_IMPORT', 'NONE');
CREATE TYPE core."navigationMenuItem_type_enum" AS ENUM ('VIEW', 'FOLDER', 'LINK', 'OBJECT', 'RECORD', 'PAGE_LAYOUT');
CREATE TYPE core."objectMetadata_openrecordin_enum" AS ENUM ('SIDE_PANEL', 'RECORD_PAGE', 'USER_CHOICE');
CREATE TYPE core."objectMetadata_readability_enum" AS ENUM ('OPEN', 'PRIVATE', 'INHERITED', 'APPLICATION', 'SYSTEM');
CREATE TYPE core."objectMetadata_sharingreach_enum" AS ENUM ('ROLE_ACCESS', 'WORKSPACE');
CREATE TYPE core."objectMetadata_writability_enum" AS ENUM ('OPEN', 'APPLICATION', 'SYSTEM');
CREATE TYPE core."pageLayoutTab_layoutmode_enum" AS ENUM ('GRID', 'VERTICAL_LIST', 'CANVAS');
CREATE TYPE core."pageLayoutWidget_type_enum" AS ENUM ('VIEW', 'IFRAME', 'FIELD', 'FIELDS', 'GRAPH', 'STANDALONE_RICH_TEXT', 'TIMELINE', 'TASKS', 'NOTES', 'FILES', 'EMAILS', 'CALENDAR', 'FIELD_RICH_TEXT', 'WORKFLOW', 'WORKFLOW_VERSION', 'WORKFLOW_RUN', 'RECORD_TABLE', 'EMAIL_THREAD', 'CALL_RECORDING_SUMMARY', 'CALL_RECORDING_TRANSCRIPT', 'MESSAGE_CAMPAIGN_BODY', 'MESSAGE_CAMPAIGN_DETAILS', 'FORM_FIELD', 'CHAT_THREADS', 'CHAT');
CREATE TYPE core."pageLayout_type_enum" AS ENUM ('RECORD_INDEX', 'RECORD_PAGE', 'DASHBOARD', 'STANDALONE_PAGE', 'RECORD_FORM');
CREATE TYPE core."routeTrigger_httpmethod_enum" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');
CREATE TYPE core."rowLevelPermissionPredicateGroup_logicaloperator_enum" AS ENUM ('AND', 'OR');
CREATE TYPE core."rowLevelPermissionPredicate_operand_enum" AS ENUM ('IS', 'IS_NOT_NULL', 'IS_NOT', 'LESS_THAN_OR_EQUAL', 'GREATER_THAN_OR_EQUAL', 'IS_BEFORE', 'IS_AFTER', 'CONTAINS', 'DOES_NOT_CONTAIN', 'IS_EMPTY', 'IS_NOT_EMPTY', 'IS_RELATIVE', 'IS_IN_PAST', 'IS_IN_FUTURE', 'IS_TODAY', 'VECTOR_SEARCH');
CREATE TYPE core."twoFactorAuthenticationMethod_status_enum" AS ENUM ('PENDING', 'VERIFIED');
CREATE TYPE core."twoFactorAuthenticationMethod_strategy_enum" AS ENUM ('TOTP');
CREATE TYPE core."unsubscribeTopic_visibility_enum" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE core."viewField_aggregateoperation_enum" AS ENUM ('MIN', 'MAX', 'AVG', 'SUM', 'COUNT', 'COUNT_UNIQUE_VALUES', 'COUNT_EMPTY', 'COUNT_NOT_EMPTY', 'COUNT_TRUE', 'COUNT_FALSE', 'PERCENTAGE_EMPTY', 'PERCENTAGE_NOT_EMPTY');
CREATE TYPE core."viewFilterGroup_logicaloperator_enum" AS ENUM ('AND', 'OR', 'NOT');
CREATE TYPE core."viewFilter_operand_enum" AS ENUM ('IS', 'IS_NOT_NULL', 'IS_NOT', 'LESS_THAN_OR_EQUAL', 'GREATER_THAN_OR_EQUAL', 'IS_BEFORE', 'IS_AFTER', 'CONTAINS', 'DOES_NOT_CONTAIN', 'IS_EMPTY', 'IS_NOT_EMPTY', 'IS_RELATIVE', 'IS_IN_PAST', 'IS_IN_FUTURE', 'IS_TODAY', 'VECTOR_SEARCH');
CREATE TYPE core."viewSort_direction_enum" AS ENUM ('ASC', 'DESC');
CREATE TYPE core."view_calendarlayout_enum" AS ENUM ('DAY', 'WEEK', 'MONTH');
CREATE TYPE core."view_kanbanaggregateoperation_enum" AS ENUM ('MIN', 'MAX', 'AVG', 'SUM', 'COUNT', 'COUNT_UNIQUE_VALUES', 'COUNT_EMPTY', 'COUNT_NOT_EMPTY', 'COUNT_TRUE', 'COUNT_FALSE', 'PERCENTAGE_EMPTY', 'PERCENTAGE_NOT_EMPTY');
CREATE TYPE core."view_key_enum" AS ENUM ('INDEX');
CREATE TYPE core."view_openrecordin_enum" AS ENUM ('SIDE_PANEL', 'RECORD_PAGE');
CREATE TYPE core."view_type_enum" AS ENUM ('TABLE', 'KANBAN', 'CALENDAR', 'LIST', 'FIELDS_WIDGET', 'TABLE_WIDGET', 'KANBAN_WIDGET', 'LIST_WIDGET', 'CALENDAR_WIDGET');
CREATE TYPE core."view_visibility_enum" AS ENUM ('WORKSPACE', 'UNLISTED');
CREATE TYPE core."workflowVersion_status_enum" AS ENUM ('DRAFT', 'ACTIVE', 'DEACTIVATED', 'ARCHIVED');
CREATE TYPE core."workspace_activationStatus_enum" AS ENUM ('ONGOING_CREATION', 'PENDING_CREATION', 'CREATED', 'ACTIVE', 'INACTIVE');
CREATE TYPE core."workspace_discoverability_enum" AS ENUM ('PUBLIC', 'MEMBERS_AND_INVITEES', 'HIDDEN');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."attachment_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."attachment_fileCategory_enum" AS ENUM ('ARCHIVE', 'AUDIO', 'IMAGE', 'PRESENTATION', 'SPREADSHEET', 'TEXT_DOCUMENT', 'VIDEO', 'OTHER');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."attachment_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."blocklist_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."blocklist_scope_enum" AS ENUM ('WORKSPACE_MEMBER', 'WORKSPACE');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."blocklist_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_responseStatus_enum" AS ENUM ('NEEDS_ACTION', 'DECLINED', 'TENTATIVE', 'ACCEPTED');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."company_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."company_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."dashboard_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."dashboard_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_status_enum" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'SENT_WITH_ERRORS', 'CANCELED');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_createdBySource_e" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_updatedBySource_e" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_direction_enum" AS ENUM ('INCOMING', 'OUTGOING');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageList_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageList_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_role_enum" AS ENUM ('FROM', 'TO', 'CC', 'BCC', 'REPLY_TO');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThread_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThread_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."message_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."message_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."note_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."note_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."opportunity_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."opportunity_stage_enum" AS ENUM ('NEW', 'SCREENING', 'MEETING', 'PROPOSAL', 'CUSTOMER');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."opportunity_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."person_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."person_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_accessLevel_enum" AS ENUM ('READ', 'READ_WRITE', 'FULL', 'NONE');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_principalType_enum" AS ENUM ('EVERYONE', 'WORKSPACE_MEMBER', 'ROLE');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_rowCause_enum" AS ENUM ('OWNER', 'MANUAL', 'RULE', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."shortLink_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."shortLink_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."task_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."task_status_enum" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."task_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_type_enum" AS ENUM ('DATABASE_EVENT', 'CRON');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_status_enum" AS ENUM ('NOT_STARTED', 'RUNNING', 'COMPLETED', 'FAILED', 'ENQUEUED', 'STOPPING', 'STOPPED');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_status_enum" AS ENUM ('DRAFT', 'ACTIVE', 'DEACTIVATED', 'ARCHIVED');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflow_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflow_statuses_enum" AS ENUM ('DRAFT', 'ACTIVE', 'DEACTIVATED');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflow_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_createdBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_dateFormat_enum" AS ENUM ('SYSTEM', 'MONTH_FIRST', 'DAY_FIRST', 'YEAR_FIRST');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_numberFormat_enum" AS ENUM ('SYSTEM', 'COMMAS_AND_DOT', 'SPACES_AND_COMMA', 'DOTS_AND_COMMA', 'APOSTROPHE_AND_DOT');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_timeFormat_enum" AS ENUM ('SYSTEM', 'HOUR_24', 'HOUR_12');
CREATE TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_updatedBySource_enum" AS ENUM ('EMAIL', 'CALENDAR', 'WORKFLOW', 'AGENT', 'API', 'IMPORT', 'MANUAL', 'SYSTEM', 'WEBHOOK', 'APPLICATION');

ALTER TABLE core."file" DROP CONSTRAINT "CHK_FILE_PENDING_MIME_OCTET_STREAM";
ALTER TABLE core."view" DROP CONSTRAINT "CHK_VIEW_CALENDAR_INTEGRITY";
ALTER TABLE core."navigationMenuItem" DROP CONSTRAINT "CHK_navigation_menu_item_type_fields";
ALTER TABLE core."workspace" DROP CONSTRAINT "onboarded_workspace_requires_default_role";
ALTER TABLE core."workspace" DROP CONSTRAINT "workspace_requires_database_schema";
DROP INDEX core."IDX_MESSAGE_CHANNEL_APP_CONNECTED_ACCOUNT_HANDLE_UNIQUE";
DROP INDEX core."IDX_WORKFLOW_VERSION_ONE_ACTIVE_PER_WORKFLOW";

ALTER TABLE core."calendarChannel" DROP CONSTRAINT "calendarChannel_syncstatus_check";
ALTER TABLE core."calendarChannel" ALTER COLUMN "syncStatus" DROP DEFAULT;
ALTER TABLE core."calendarChannel" ALTER COLUMN "syncStatus" TYPE core."calendarChannel_syncstatus_enum" USING "syncStatus"::core."calendarChannel_syncstatus_enum";
ALTER TABLE core."calendarChannel" ALTER COLUMN "syncStatus" SET DEFAULT 'NOT_SYNCED'::core."calendarChannel_syncstatus_enum";
ALTER TABLE core."calendarChannel" DROP CONSTRAINT "calendarChannel_syncstage_check";
ALTER TABLE core."calendarChannel" ALTER COLUMN "syncStage" TYPE core."calendarChannel_syncstage_enum" USING "syncStage"::core."calendarChannel_syncstage_enum";
ALTER TABLE core."calendarChannel" DROP CONSTRAINT "calendarChannel_visibility_check";
ALTER TABLE core."calendarChannel" ALTER COLUMN "visibility" TYPE core."calendarChannel_visibility_enum" USING "visibility"::core."calendarChannel_visibility_enum";
ALTER TABLE core."calendarChannel" DROP CONSTRAINT "calendarChannel_contactautocreationpolicy_check";
ALTER TABLE core."calendarChannel" ALTER COLUMN "contactAutoCreationPolicy" DROP DEFAULT;
ALTER TABLE core."calendarChannel" ALTER COLUMN "contactAutoCreationPolicy" TYPE core."calendarChannel_contactautocreationpolicy_enum" USING "contactAutoCreationPolicy"::core."calendarChannel_contactautocreationpolicy_enum";
ALTER TABLE core."calendarChannel" ALTER COLUMN "contactAutoCreationPolicy" SET DEFAULT 'AS_PARTICIPANT_AND_ORGANIZER'::core."calendarChannel_contactautocreationpolicy_enum";
ALTER TABLE core."calendarChannel" DROP CONSTRAINT "calendarChannel_webhooksubscriptionstatus_check";
ALTER TABLE core."calendarChannel" ALTER COLUMN "webhookSubscriptionStatus" TYPE core."calendarChannel_webhooksubscriptionstatus_enum" USING "webhookSubscriptionStatus"::core."calendarChannel_webhooksubscriptionstatus_enum";
ALTER TABLE core."commandMenuItem" DROP CONSTRAINT "commandMenuItem_availabilitytype_check";
ALTER TABLE core."commandMenuItem" ALTER COLUMN "availabilityType" DROP DEFAULT;
ALTER TABLE core."commandMenuItem" ALTER COLUMN "availabilityType" TYPE core."commandMenuItem_availabilitytype_enum" USING "availabilityType"::core."commandMenuItem_availabilitytype_enum";
ALTER TABLE core."commandMenuItem" ALTER COLUMN "availabilityType" SET DEFAULT 'GLOBAL'::core."commandMenuItem_availabilitytype_enum";
ALTER TABLE core."dataSource" DROP CONSTRAINT "dataSource_type_check";
ALTER TABLE core."dataSource" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."dataSource" ALTER COLUMN "type" TYPE core."dataSource_type_enum" USING "type"::core."dataSource_type_enum";
ALTER TABLE core."dataSource" ALTER COLUMN "type" SET DEFAULT 'postgres'::core."dataSource_type_enum";
ALTER TABLE core."dpaAgreement" DROP CONSTRAINT "dpaAgreement_type_check";
ALTER TABLE core."dpaAgreement" ALTER COLUMN "type" TYPE core."dpaAgreement_type_enum" USING "type"::core."dpaAgreement_type_enum";
ALTER TABLE core."emailingDomain" DROP CONSTRAINT "emailingDomain_status_check";
ALTER TABLE core."emailingDomain" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE core."emailingDomain" ALTER COLUMN "status" TYPE core."emailingDomain_status_enum" USING "status"::core."emailingDomain_status_enum";
ALTER TABLE core."emailingDomain" ALTER COLUMN "status" SET DEFAULT 'PENDING'::core."emailingDomain_status_enum";
ALTER TABLE core."emailingDomain" DROP CONSTRAINT "emailingDomain_tenantstatus_check";
ALTER TABLE core."emailingDomain" ALTER COLUMN "tenantStatus" DROP DEFAULT;
ALTER TABLE core."emailingDomain" ALTER COLUMN "tenantStatus" TYPE core."emailingDomain_tenantstatus_enum" USING "tenantStatus"::core."emailingDomain_tenantstatus_enum";
ALTER TABLE core."emailingDomain" ALTER COLUMN "tenantStatus" SET DEFAULT 'ACTIVE'::core."emailingDomain_tenantstatus_enum";
ALTER TABLE core."emailingDomain" DROP CONSTRAINT "emailingDomain_unsubscribehostnamestatus_check";
ALTER TABLE core."emailingDomain" ALTER COLUMN "unsubscribeHostnameStatus" TYPE core."emailingDomain_unsubscribehostnamestatus_enum" USING "unsubscribeHostnameStatus"::core."emailingDomain_unsubscribehostnamestatus_enum";
ALTER TABLE core."fieldMetadata" DROP CONSTRAINT "fieldMetadata_writability_check";
ALTER TABLE core."fieldMetadata" ALTER COLUMN "writability" DROP DEFAULT;
ALTER TABLE core."fieldMetadata" ALTER COLUMN "writability" TYPE core."fieldMetadata_writability_enum" USING "writability"::core."fieldMetadata_writability_enum";
ALTER TABLE core."fieldMetadata" ALTER COLUMN "writability" SET DEFAULT 'OPEN'::core."fieldMetadata_writability_enum";
ALTER TABLE core."file" DROP CONSTRAINT "file_status_check";
ALTER TABLE core."file" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE core."file" ALTER COLUMN "status" TYPE core."file_status_enum" USING "status"::core."file_status_enum";
ALTER TABLE core."file" ALTER COLUMN "status" SET DEFAULT 'UPLOADED'::core.file_status_enum;
ALTER TABLE core."indexMetadata" DROP CONSTRAINT "indexMetadata_indextype_check";
ALTER TABLE core."indexMetadata" ALTER COLUMN "indexType" DROP DEFAULT;
ALTER TABLE core."indexMetadata" ALTER COLUMN "indexType" TYPE core."indexMetadata_indextype_enum" USING "indexType"::core."indexMetadata_indextype_enum";
ALTER TABLE core."indexMetadata" ALTER COLUMN "indexType" SET DEFAULT 'BTREE'::core."indexMetadata_indextype_enum";
ALTER TABLE core."keyValuePair" DROP CONSTRAINT "keyValuePair_type_check";
ALTER TABLE core."keyValuePair" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."keyValuePair" ALTER COLUMN "type" TYPE core."keyValuePair_type_enum" USING "type"::core."keyValuePair_type_enum";
ALTER TABLE core."keyValuePair" ALTER COLUMN "type" SET DEFAULT 'USER_VARIABLE'::core."keyValuePair_type_enum";
ALTER TABLE core."messageChannel" DROP CONSTRAINT "messageChannel_visibility_check";
ALTER TABLE core."messageChannel" ALTER COLUMN "visibility" TYPE core."messageChannel_visibility_enum" USING "visibility"::core."messageChannel_visibility_enum";
ALTER TABLE core."messageChannel" DROP CONSTRAINT "messageChannel_type_check";
ALTER TABLE core."messageChannel" ALTER COLUMN "type" TYPE core."messageChannel_type_enum" USING "type"::core."messageChannel_type_enum";
ALTER TABLE core."messageChannel" DROP CONSTRAINT "messageChannel_contactautocreationpolicy_check";
ALTER TABLE core."messageChannel" ALTER COLUMN "contactAutoCreationPolicy" DROP DEFAULT;
ALTER TABLE core."messageChannel" ALTER COLUMN "contactAutoCreationPolicy" TYPE core."messageChannel_contactautocreationpolicy_enum" USING "contactAutoCreationPolicy"::core."messageChannel_contactautocreationpolicy_enum";
ALTER TABLE core."messageChannel" ALTER COLUMN "contactAutoCreationPolicy" SET DEFAULT 'SENT'::core."messageChannel_contactautocreationpolicy_enum";
ALTER TABLE core."messageChannel" DROP CONSTRAINT "messageChannel_messagefolderimportpolicy_check";
ALTER TABLE core."messageChannel" ALTER COLUMN "messageFolderImportPolicy" DROP DEFAULT;
ALTER TABLE core."messageChannel" ALTER COLUMN "messageFolderImportPolicy" TYPE core."messageChannel_messagefolderimportpolicy_enum" USING "messageFolderImportPolicy"::core."messageChannel_messagefolderimportpolicy_enum";
ALTER TABLE core."messageChannel" ALTER COLUMN "messageFolderImportPolicy" SET DEFAULT 'ALL_FOLDERS'::core."messageChannel_messagefolderimportpolicy_enum";
ALTER TABLE core."messageChannel" DROP CONSTRAINT "messageChannel_pendinggroupemailsaction_check";
ALTER TABLE core."messageChannel" ALTER COLUMN "pendingGroupEmailsAction" TYPE core."messageChannel_pendinggroupemailsaction_enum" USING "pendingGroupEmailsAction"::core."messageChannel_pendinggroupemailsaction_enum";
ALTER TABLE core."messageChannel" DROP CONSTRAINT "messageChannel_syncstatus_check";
ALTER TABLE core."messageChannel" ALTER COLUMN "syncStatus" DROP DEFAULT;
ALTER TABLE core."messageChannel" ALTER COLUMN "syncStatus" TYPE core."messageChannel_syncstatus_enum" USING "syncStatus"::core."messageChannel_syncstatus_enum";
ALTER TABLE core."messageChannel" ALTER COLUMN "syncStatus" SET DEFAULT 'NOT_SYNCED'::core."messageChannel_syncstatus_enum";
ALTER TABLE core."messageChannel" DROP CONSTRAINT "messageChannel_syncstage_check";
ALTER TABLE core."messageChannel" ALTER COLUMN "syncStage" TYPE core."messageChannel_syncstage_enum" USING "syncStage"::core."messageChannel_syncstage_enum";
ALTER TABLE core."messageChannel" DROP CONSTRAINT "messageChannel_webhooksubscriptionstatus_check";
ALTER TABLE core."messageChannel" ALTER COLUMN "webhookSubscriptionStatus" TYPE core."messageChannel_webhooksubscriptionstatus_enum" USING "webhookSubscriptionStatus"::core."messageChannel_webhooksubscriptionstatus_enum";
ALTER TABLE core."messageFolder" DROP CONSTRAINT "messageFolder_pendingsyncaction_check";
ALTER TABLE core."messageFolder" ALTER COLUMN "pendingSyncAction" DROP DEFAULT;
ALTER TABLE core."messageFolder" ALTER COLUMN "pendingSyncAction" TYPE core."messageFolder_pendingsyncaction_enum" USING "pendingSyncAction"::core."messageFolder_pendingsyncaction_enum";
ALTER TABLE core."messageFolder" ALTER COLUMN "pendingSyncAction" SET DEFAULT 'NONE'::core."messageFolder_pendingsyncaction_enum";
ALTER TABLE core."navigationMenuItem" DROP CONSTRAINT "navigationMenuItem_type_check";
ALTER TABLE core."navigationMenuItem" ALTER COLUMN "type" TYPE core."navigationMenuItem_type_enum" USING "type"::core."navigationMenuItem_type_enum";
ALTER TABLE core."objectMetadata" DROP CONSTRAINT "objectMetadata_openrecordin_check";
ALTER TABLE core."objectMetadata" ALTER COLUMN "openRecordIn" DROP DEFAULT;
ALTER TABLE core."objectMetadata" ALTER COLUMN "openRecordIn" TYPE core."objectMetadata_openrecordin_enum" USING "openRecordIn"::core."objectMetadata_openrecordin_enum";
ALTER TABLE core."objectMetadata" ALTER COLUMN "openRecordIn" SET DEFAULT 'USER_CHOICE'::core."objectMetadata_openrecordin_enum";
ALTER TABLE core."objectMetadata" DROP CONSTRAINT "objectMetadata_writability_check";
ALTER TABLE core."objectMetadata" ALTER COLUMN "writability" DROP DEFAULT;
ALTER TABLE core."objectMetadata" ALTER COLUMN "writability" TYPE core."objectMetadata_writability_enum" USING "writability"::core."objectMetadata_writability_enum";
ALTER TABLE core."objectMetadata" ALTER COLUMN "writability" SET DEFAULT 'OPEN'::core."objectMetadata_writability_enum";
ALTER TABLE core."objectMetadata" DROP CONSTRAINT "objectMetadata_readability_check";
ALTER TABLE core."objectMetadata" ALTER COLUMN "readability" DROP DEFAULT;
ALTER TABLE core."objectMetadata" ALTER COLUMN "readability" TYPE core."objectMetadata_readability_enum" USING "readability"::core."objectMetadata_readability_enum";
ALTER TABLE core."objectMetadata" ALTER COLUMN "readability" SET DEFAULT 'OPEN'::core."objectMetadata_readability_enum";
ALTER TABLE core."objectMetadata" DROP CONSTRAINT "objectMetadata_sharingreach_check";
ALTER TABLE core."objectMetadata" ALTER COLUMN "sharingReach" DROP DEFAULT;
ALTER TABLE core."objectMetadata" ALTER COLUMN "sharingReach" TYPE core."objectMetadata_sharingreach_enum" USING "sharingReach"::core."objectMetadata_sharingreach_enum";
ALTER TABLE core."objectMetadata" ALTER COLUMN "sharingReach" SET DEFAULT 'WORKSPACE'::core."objectMetadata_sharingreach_enum";
ALTER TABLE core."pageLayout" DROP CONSTRAINT "pageLayout_type_check";
ALTER TABLE core."pageLayout" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."pageLayout" ALTER COLUMN "type" TYPE core."pageLayout_type_enum" USING "type"::core."pageLayout_type_enum";
ALTER TABLE core."pageLayout" ALTER COLUMN "type" SET DEFAULT 'RECORD_PAGE'::core."pageLayout_type_enum";
ALTER TABLE core."pageLayoutTab" DROP CONSTRAINT "pageLayoutTab_layoutmode_check";
ALTER TABLE core."pageLayoutTab" ALTER COLUMN "layoutMode" DROP DEFAULT;
ALTER TABLE core."pageLayoutTab" ALTER COLUMN "layoutMode" TYPE core."pageLayoutTab_layoutmode_enum" USING "layoutMode"::core."pageLayoutTab_layoutmode_enum";
ALTER TABLE core."pageLayoutTab" ALTER COLUMN "layoutMode" SET DEFAULT 'GRID'::core."pageLayoutTab_layoutmode_enum";
ALTER TABLE core."pageLayoutWidget" DROP CONSTRAINT "pageLayoutWidget_type_check";
ALTER TABLE core."pageLayoutWidget" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."pageLayoutWidget" ALTER COLUMN "type" TYPE core."pageLayoutWidget_type_enum" USING "type"::core."pageLayoutWidget_type_enum";
ALTER TABLE core."pageLayoutWidget" ALTER COLUMN "type" SET DEFAULT 'VIEW'::core."pageLayoutWidget_type_enum";
ALTER TABLE core."rowLevelPermissionPredicate" DROP CONSTRAINT "rowLevelPermissionPredicate_operand_check";
ALTER TABLE core."rowLevelPermissionPredicate" ALTER COLUMN "operand" DROP DEFAULT;
ALTER TABLE core."rowLevelPermissionPredicate" ALTER COLUMN "operand" TYPE core."rowLevelPermissionPredicate_operand_enum" USING "operand"::core."rowLevelPermissionPredicate_operand_enum";
ALTER TABLE core."rowLevelPermissionPredicate" ALTER COLUMN "operand" SET DEFAULT 'CONTAINS'::core."rowLevelPermissionPredicate_operand_enum";
ALTER TABLE core."rowLevelPermissionPredicateGroup" DROP CONSTRAINT "rowLevelPermissionPredicateGroup_logicaloperator_check";
ALTER TABLE core."rowLevelPermissionPredicateGroup" ALTER COLUMN "logicalOperator" DROP DEFAULT;
ALTER TABLE core."rowLevelPermissionPredicateGroup" ALTER COLUMN "logicalOperator" TYPE core."rowLevelPermissionPredicateGroup_logicaloperator_enum" USING "logicalOperator"::core."rowLevelPermissionPredicateGroup_logicaloperator_enum";
ALTER TABLE core."rowLevelPermissionPredicateGroup" ALTER COLUMN "logicalOperator" SET DEFAULT 'AND'::core."rowLevelPermissionPredicateGroup_logicaloperator_enum";
ALTER TABLE core."twoFactorAuthenticationMethod" DROP CONSTRAINT "twoFactorAuthenticationMethod_status_check";
ALTER TABLE core."twoFactorAuthenticationMethod" ALTER COLUMN "status" TYPE core."twoFactorAuthenticationMethod_status_enum" USING "status"::core."twoFactorAuthenticationMethod_status_enum";
ALTER TABLE core."twoFactorAuthenticationMethod" DROP CONSTRAINT "twoFactorAuthenticationMethod_strategy_check";
ALTER TABLE core."twoFactorAuthenticationMethod" ALTER COLUMN "strategy" TYPE core."twoFactorAuthenticationMethod_strategy_enum" USING "strategy"::core."twoFactorAuthenticationMethod_strategy_enum";
ALTER TABLE core."unsubscribeTopic" DROP CONSTRAINT "unsubscribeTopic_visibility_check";
ALTER TABLE core."unsubscribeTopic" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE core."unsubscribeTopic" ALTER COLUMN "visibility" TYPE core."unsubscribeTopic_visibility_enum" USING "visibility"::core."unsubscribeTopic_visibility_enum";
ALTER TABLE core."unsubscribeTopic" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE'::core."unsubscribeTopic_visibility_enum";
ALTER TABLE core."view" DROP CONSTRAINT "view_type_check";
ALTER TABLE core."view" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE core."view" ALTER COLUMN "type" TYPE core."view_type_enum" USING "type"::core."view_type_enum";
ALTER TABLE core."view" ALTER COLUMN "type" SET DEFAULT 'TABLE'::core.view_type_enum;
ALTER TABLE core."view" DROP CONSTRAINT "view_key_check";
ALTER TABLE core."view" ALTER COLUMN "key" TYPE core."view_key_enum" USING "key"::core."view_key_enum";
ALTER TABLE core."view" DROP CONSTRAINT "view_openrecordin_check";
ALTER TABLE core."view" ALTER COLUMN "openRecordIn" DROP DEFAULT;
ALTER TABLE core."view" ALTER COLUMN "openRecordIn" TYPE core."view_openrecordin_enum" USING "openRecordIn"::core."view_openrecordin_enum";
ALTER TABLE core."view" ALTER COLUMN "openRecordIn" SET DEFAULT 'SIDE_PANEL'::core.view_openrecordin_enum;
ALTER TABLE core."view" DROP CONSTRAINT "view_kanbanaggregateoperation_check";
ALTER TABLE core."view" ALTER COLUMN "kanbanAggregateOperation" TYPE core."view_kanbanaggregateoperation_enum" USING "kanbanAggregateOperation"::core."view_kanbanaggregateoperation_enum";
ALTER TABLE core."view" DROP CONSTRAINT "view_calendarlayout_check";
ALTER TABLE core."view" ALTER COLUMN "calendarLayout" TYPE core."view_calendarlayout_enum" USING "calendarLayout"::core."view_calendarlayout_enum";
ALTER TABLE core."view" DROP CONSTRAINT "view_visibility_check";
ALTER TABLE core."view" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE core."view" ALTER COLUMN "visibility" TYPE core."view_visibility_enum" USING "visibility"::core."view_visibility_enum";
ALTER TABLE core."view" ALTER COLUMN "visibility" SET DEFAULT 'WORKSPACE'::core.view_visibility_enum;
ALTER TABLE core."viewField" DROP CONSTRAINT "viewField_aggregateoperation_check";
ALTER TABLE core."viewField" ALTER COLUMN "aggregateOperation" TYPE core."viewField_aggregateoperation_enum" USING "aggregateOperation"::core."viewField_aggregateoperation_enum";
ALTER TABLE core."viewFilter" DROP CONSTRAINT "viewFilter_operand_check";
ALTER TABLE core."viewFilter" ALTER COLUMN "operand" DROP DEFAULT;
ALTER TABLE core."viewFilter" ALTER COLUMN "operand" TYPE core."viewFilter_operand_enum" USING "operand"::core."viewFilter_operand_enum";
ALTER TABLE core."viewFilter" ALTER COLUMN "operand" SET DEFAULT 'CONTAINS'::core."viewFilter_operand_enum";
ALTER TABLE core."viewFilterGroup" DROP CONSTRAINT "viewFilterGroup_logicaloperator_check";
ALTER TABLE core."viewFilterGroup" ALTER COLUMN "logicalOperator" DROP DEFAULT;
ALTER TABLE core."viewFilterGroup" ALTER COLUMN "logicalOperator" TYPE core."viewFilterGroup_logicaloperator_enum" USING "logicalOperator"::core."viewFilterGroup_logicaloperator_enum";
ALTER TABLE core."viewFilterGroup" ALTER COLUMN "logicalOperator" SET DEFAULT 'AND'::core."viewFilterGroup_logicaloperator_enum";
ALTER TABLE core."viewSort" DROP CONSTRAINT "viewSort_direction_check";
ALTER TABLE core."viewSort" ALTER COLUMN "direction" DROP DEFAULT;
ALTER TABLE core."viewSort" ALTER COLUMN "direction" TYPE core."viewSort_direction_enum" USING "direction"::core."viewSort_direction_enum";
ALTER TABLE core."viewSort" ALTER COLUMN "direction" SET DEFAULT 'ASC'::core."viewSort_direction_enum";
ALTER TABLE core."workflowVersion" DROP CONSTRAINT "workflowVersion_status_check";
ALTER TABLE core."workflowVersion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE core."workflowVersion" ALTER COLUMN "status" TYPE core."workflowVersion_status_enum" USING "status"::core."workflowVersion_status_enum";
ALTER TABLE core."workflowVersion" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::core."workflowVersion_status_enum";
ALTER TABLE core."workspace" DROP CONSTRAINT "workspace_activationStatus_check";
ALTER TABLE core."workspace" ALTER COLUMN "activationStatus" DROP DEFAULT;
ALTER TABLE core."workspace" ALTER COLUMN "activationStatus" TYPE core."workspace_activationStatus_enum" USING "activationStatus"::core."workspace_activationStatus_enum";
ALTER TABLE core."workspace" ALTER COLUMN "activationStatus" SET DEFAULT 'INACTIVE'::core."workspace_activationStatus_enum";
ALTER TABLE core."workspace" DROP CONSTRAINT "workspace_discoverability_check";
ALTER TABLE core."workspace" ALTER COLUMN "workspaceDiscoverability" DROP DEFAULT;
ALTER TABLE core."workspace" ALTER COLUMN "workspaceDiscoverability" TYPE core."workspace_discoverability_enum" USING "workspaceDiscoverability"::core."workspace_discoverability_enum";
ALTER TABLE core."workspace" ALTER COLUMN "workspaceDiscoverability" SET DEFAULT 'PUBLIC'::core.workspace_discoverability_enum;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn" DROP CONSTRAINT "agentTurn_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."agentTurn_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."agentTurn" ALTER COLUMN "createdBySource" SET DEFAULT 'SYSTEM'::workspace_2abogkkt2zd45pa9aun09djpf."agentTurn_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" DROP CONSTRAINT "attachment_fileCategory_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "fileCategory" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "fileCategory" TYPE workspace_2abogkkt2zd45pa9aun09djpf."attachment_fileCategory_enum" USING "fileCategory"::workspace_2abogkkt2zd45pa9aun09djpf."attachment_fileCategory_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "fileCategory" SET DEFAULT 'OTHER'::workspace_2abogkkt2zd45pa9aun09djpf."attachment_fileCategory_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" DROP CONSTRAINT "attachment_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."attachment_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."attachment_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."attachment_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" DROP CONSTRAINT "attachment_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."attachment_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."attachment_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."attachment" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."attachment_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" DROP CONSTRAINT "blocklist_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."blocklist_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."blocklist_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."blocklist_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" DROP CONSTRAINT "blocklist_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."blocklist_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."blocklist_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."blocklist_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" DROP CONSTRAINT "blocklist_scope_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "scope" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "scope" TYPE workspace_2abogkkt2zd45pa9aun09djpf."blocklist_scope_enum" USING "scope"::workspace_2abogkkt2zd45pa9aun09djpf."blocklist_scope_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."blocklist" ALTER COLUMN "scope" SET DEFAULT 'WORKSPACE_MEMBER'::workspace_2abogkkt2zd45pa9aun09djpf.blocklist_scope_enum;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" DROP CONSTRAINT "calendarChannelEventAssociation_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" DROP CONSTRAINT "calendarChannelEventAssociation_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."calendarChannelEventAssociation_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" DROP CONSTRAINT "calendarEvent_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" DROP CONSTRAINT "calendarEvent_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."calendarEvent_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" DROP CONSTRAINT "calendarEventParticipant_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" DROP CONSTRAINT "calendarEventParticipant_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" DROP CONSTRAINT "calendarEventParticipant_responseStatus_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "responseStatus" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "responseStatus" TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_responseStatus_enum" USING "responseStatus"::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_responseStatus_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant" ALTER COLUMN "responseStatus" SET DEFAULT 'NEEDS_ACTION'::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventParticipant_responseStatus_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" DROP CONSTRAINT "calendarEventTarget_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" DROP CONSTRAINT "calendarEventTarget_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."calendarEventTarget_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" DROP CONSTRAINT "company_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."company_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."company_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."company_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" DROP CONSTRAINT "company_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."company_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."company_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."company" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."company_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" DROP CONSTRAINT "dashboard_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."dashboard_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."dashboard_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."dashboard_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" DROP CONSTRAINT "dashboard_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."dashboard_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."dashboard_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."dashboard" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."dashboard_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" DROP CONSTRAINT "message_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."message_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."message_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."message_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" DROP CONSTRAINT "message_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."message_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."message_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."message" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."message_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" DROP CONSTRAINT "messageCampaign_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" DROP CONSTRAINT "messageCampaign_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" DROP CONSTRAINT "messageCampaign_status_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "status" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_status_enum" USING "status"::workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_status_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::workspace_2abogkkt2zd45pa9aun09djpf."messageCampaign_status_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" DROP CONSTRAINT "messageChannelMessageAssociation_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" DROP CONSTRAINT "messageChannelMessageAssociation_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" DROP CONSTRAINT "messageChannelMessageAssociation_direction_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "direction" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "direction" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_direction_enum" USING "direction"::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_direction_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation" ALTER COLUMN "direction" SET DEFAULT 'INCOMING'::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociation_direction_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" DROP CONSTRAINT "messageChannelMessageAssociationMessageFolder_createdBySource_c";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_createdBySource_e" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_createdBySource_e";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_createdBySource_e";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" DROP CONSTRAINT "messageChannelMessageAssociationMessageFolder_updatedBySource_c";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_updatedBySource_e" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_updatedBySource_e";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageChannelMessageAssociationMessageFolder_updatedBySource_e";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" DROP CONSTRAINT "messageList_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageList_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageList_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageList_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" DROP CONSTRAINT "messageList_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageList_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageList_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageList" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageList_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" DROP CONSTRAINT "messageListMember_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" DROP CONSTRAINT "messageListMember_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageListMember" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageListMember_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" DROP CONSTRAINT "messageParticipant_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" DROP CONSTRAINT "messageParticipant_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" DROP CONSTRAINT "messageParticipant_role_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "role" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_role_enum" USING "role"::workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_role_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant" ALTER COLUMN "role" SET DEFAULT 'FROM'::workspace_2abogkkt2zd45pa9aun09djpf."messageParticipant_role_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" DROP CONSTRAINT "messageThread_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThread_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageThread_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageThread_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" DROP CONSTRAINT "messageThread_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThread_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageThread_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThread" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageThread_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" DROP CONSTRAINT "messageThreadTarget_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" DROP CONSTRAINT "messageThreadTarget_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."messageThreadTarget_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" DROP CONSTRAINT "note_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."note_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."note_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."note_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" DROP CONSTRAINT "note_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."note_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."note_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."note" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."note_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" DROP CONSTRAINT "noteTarget_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" DROP CONSTRAINT "noteTarget_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."noteTarget" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."noteTarget_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" DROP CONSTRAINT "opportunity_stage_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "stage" TYPE workspace_2abogkkt2zd45pa9aun09djpf."opportunity_stage_enum" USING "stage"::workspace_2abogkkt2zd45pa9aun09djpf."opportunity_stage_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "stage" SET DEFAULT 'NEW'::workspace_2abogkkt2zd45pa9aun09djpf.opportunity_stage_enum;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" DROP CONSTRAINT "opportunity_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."opportunity_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."opportunity_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."opportunity_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" DROP CONSTRAINT "opportunity_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."opportunity_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."opportunity_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."opportunity" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."opportunity_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" DROP CONSTRAINT "person_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."person_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."person_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."person_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" DROP CONSTRAINT "person_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."person_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."person_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."person" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."person_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" DROP CONSTRAINT "recordShare_principalType_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "principalType" TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_principalType_enum" USING "principalType"::workspace_2abogkkt2zd45pa9aun09djpf."recordShare_principalType_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" DROP CONSTRAINT "recordShare_accessLevel_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "accessLevel" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "accessLevel" TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_accessLevel_enum" USING "accessLevel"::workspace_2abogkkt2zd45pa9aun09djpf."recordShare_accessLevel_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "accessLevel" SET DEFAULT 'READ'::workspace_2abogkkt2zd45pa9aun09djpf."recordShare_accessLevel_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" DROP CONSTRAINT "recordShare_rowCause_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "rowCause" TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_rowCause_enum" USING "rowCause"::workspace_2abogkkt2zd45pa9aun09djpf."recordShare_rowCause_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" DROP CONSTRAINT "recordShare_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."recordShare_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."recordShare_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" DROP CONSTRAINT "recordShare_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."recordShare_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."recordShare_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."recordShare" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."recordShare_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" DROP CONSTRAINT "shortLink_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."shortLink_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."shortLink_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."shortLink_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" DROP CONSTRAINT "shortLink_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."shortLink_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."shortLink_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."shortLink" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."shortLink_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" DROP CONSTRAINT "task_status_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "status" TYPE workspace_2abogkkt2zd45pa9aun09djpf."task_status_enum" USING "status"::workspace_2abogkkt2zd45pa9aun09djpf."task_status_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "status" SET DEFAULT 'TODO'::workspace_2abogkkt2zd45pa9aun09djpf.task_status_enum;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" DROP CONSTRAINT "task_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."task_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."task_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."task_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" DROP CONSTRAINT "task_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."task_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."task_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."task" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."task_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" DROP CONSTRAINT "taskTarget_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" DROP CONSTRAINT "taskTarget_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."taskTarget" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."taskTarget_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" DROP CONSTRAINT "timelineActivity_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" DROP CONSTRAINT "timelineActivity_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."timelineActivity_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" DROP CONSTRAINT "workflow_statuses_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "statuses" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflow_statuses_enum"[] USING "statuses"::workspace_2abogkkt2zd45pa9aun09djpf."workflow_statuses_enum"[];
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" DROP CONSTRAINT "workflow_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflow_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workflow_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workflow_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" DROP CONSTRAINT "workflow_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflow_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workflow_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflow" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workflow_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" DROP CONSTRAINT "workflowAutomatedTrigger_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" DROP CONSTRAINT "workflowAutomatedTrigger_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" DROP CONSTRAINT "workflowAutomatedTrigger_type_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "type" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_type_enum" USING "type"::workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_type_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger" ALTER COLUMN "type" SET DEFAULT 'DATABASE_EVENT'::workspace_2abogkkt2zd45pa9aun09djpf."workflowAutomatedTrigger_type_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" DROP CONSTRAINT "workflowRun_status_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "status" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_status_enum" USING "status"::workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_status_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED'::workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_status_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" DROP CONSTRAINT "workflowRun_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" DROP CONSTRAINT "workflowRun_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowRun" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workflowRun_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" DROP CONSTRAINT "workflowVersion_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" DROP CONSTRAINT "workflowVersion_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" DROP CONSTRAINT "workflowVersion_status_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "status" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_status_enum" USING "status"::workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_status_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::workspace_2abogkkt2zd45pa9aun09djpf."workflowVersion_status_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" DROP CONSTRAINT "workspaceMember_dateFormat_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "dateFormat" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "dateFormat" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_dateFormat_enum" USING "dateFormat"::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_dateFormat_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "dateFormat" SET DEFAULT 'SYSTEM'::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_dateFormat_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" DROP CONSTRAINT "workspaceMember_timeFormat_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "timeFormat" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "timeFormat" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_timeFormat_enum" USING "timeFormat"::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_timeFormat_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "timeFormat" SET DEFAULT 'SYSTEM'::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_timeFormat_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" DROP CONSTRAINT "workspaceMember_numberFormat_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "numberFormat" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "numberFormat" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_numberFormat_enum" USING "numberFormat"::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_numberFormat_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "numberFormat" SET DEFAULT 'SYSTEM'::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_numberFormat_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" DROP CONSTRAINT "workspaceMember_createdBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "createdBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "createdBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_createdBySource_enum" USING "createdBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "createdBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_createdBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" DROP CONSTRAINT "workspaceMember_updatedBySource_check";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "updatedBySource" DROP DEFAULT;
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "updatedBySource" TYPE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_updatedBySource_enum" USING "updatedBySource"::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_updatedBySource_enum";
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" ALTER COLUMN "updatedBySource" SET DEFAULT 'MANUAL'::workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember_updatedBySource_enum";

ALTER TABLE core."file" ADD CONSTRAINT "CHK_FILE_PENDING_MIME_OCTET_STREAM" CHECK (((status <> 'PENDING'::core.file_status_enum) OR (("mimeType")::text = 'application/octet-stream'::text))) NOT VALID;
ALTER TABLE core."view" ADD CONSTRAINT "CHK_VIEW_CALENDAR_INTEGRITY" CHECK (((type <> ALL (ARRAY['CALENDAR'::core.view_type_enum, 'CALENDAR_WIDGET'::core.view_type_enum])) OR (("calendarLayout" IS NOT NULL) AND ("calendarFieldMetadataId" IS NOT NULL))));
ALTER TABLE core."navigationMenuItem" ADD CONSTRAINT "CHK_navigation_menu_item_type_fields" CHECK (((type = 'FOLDER'::core."navigationMenuItem_type_enum") OR ((type = 'OBJECT'::core."navigationMenuItem_type_enum") AND ("targetObjectMetadataId" IS NOT NULL)) OR ((type = 'VIEW'::core."navigationMenuItem_type_enum") AND ("viewId" IS NOT NULL)) OR ((type = 'RECORD'::core."navigationMenuItem_type_enum") AND ("targetRecordId" IS NOT NULL) AND ("targetObjectMetadataId" IS NOT NULL)) OR ((type = 'LINK'::core."navigationMenuItem_type_enum") AND (link IS NOT NULL)) OR ((type = 'PAGE_LAYOUT'::core."navigationMenuItem_type_enum") AND ("pageLayoutId" IS NOT NULL))));
ALTER TABLE core."workspace" ADD CONSTRAINT "onboarded_workspace_requires_default_role" CHECK ((("activationStatus" = ANY (ARRAY['PENDING_CREATION'::core."workspace_activationStatus_enum", 'ONGOING_CREATION'::core."workspace_activationStatus_enum"])) OR ("defaultRoleId" IS NOT NULL)));
ALTER TABLE core."workspace" ADD CONSTRAINT "workspace_requires_database_schema" CHECK ((("activationStatus" = ANY (ARRAY['PENDING_CREATION'::core."workspace_activationStatus_enum", 'ONGOING_CREATION'::core."workspace_activationStatus_enum"])) OR (("databaseSchema" IS NOT NULL) AND (("databaseSchema")::text <> ''::text))));
CREATE UNIQUE INDEX "IDX_MESSAGE_CHANNEL_APP_CONNECTED_ACCOUNT_HANDLE_UNIQUE" ON core."messageChannel" USING btree ("workspaceId", "connectedAccountId", handle) WHERE (type = 'APP'::core."messageChannel_type_enum");
CREATE UNIQUE INDEX "IDX_WORKFLOW_VERSION_ONE_ACTIVE_PER_WORKFLOW" ON core."workflowVersion" USING btree ("workspaceId", "coreWorkflowId") WHERE (status = 'ACTIVE'::core."workflowVersion_status_enum");
-- +goose StatementEnd
