import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class Phase2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import Phase 1 resources
    const rawSchemesBucket = s3.Bucket.fromBucketName(
      this,
      'ImportedRawBucket',
      `govsaathi-schemes-raw-${this.account}`
    );

    const processedBucket = s3.Bucket.fromBucketName(
      this,
      'ImportedProcessedBucket',
      `govsaathi-processed-${this.account}`
    );

    const promptsBucket = s3.Bucket.fromBucketName(
      this,
      'ImportedPromptsBucket',
      `govsaathi-prompts-${this.account}`
    );

    const schemesTable = dynamodb.Table.fromTableName(
      this,
      'ImportedSchemesTable',
      'GovSaathi-Schemes'
    );

    // New DynamoDB Tables for Phase 2
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'GovSaathi-Users',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: false,
    });

    const matchCacheTable = new dynamodb.Table(this, 'MatchCacheTable', {
      tableName: 'GovSaathi-MatchCache',
      partitionKey: { name: 'query_hash', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: false,
    });

    // Lambda: Enhanced Textract Processor with Embeddings
    const enhancedTextractProcessor = new lambda.Function(
      this,
      'EnhancedTextractProcessor',
      {
        functionName: 'GovSaathi-EnhancedTextractProcessor',
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset('lambdas/enhanced-scheme-ingestion'),
        timeout: cdk.Duration.minutes(5),
        memorySize: 1024,
        reservedConcurrentExecutions: 20,
        environment: {
          PROCESSED_BUCKET: processedBucket.bucketName,
          PROMPTS_BUCKET: promptsBucket.bucketName,
          SCHEMES_TABLE: schemesTable.tableName,
        },
      }
    );

    rawSchemesBucket.grantRead(enhancedTextractProcessor);
    processedBucket.grantWrite(enhancedTextractProcessor);
    promptsBucket.grantRead(enhancedTextractProcessor);
    schemesTable.grantWriteData(enhancedTextractProcessor);

    enhancedTextractProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['textract:DetectDocumentText'],
        resources: ['*'],
      })
    );

    enhancedTextractProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      })
    );

    // Lambda: User Profile Processor (Comprehend)
    const userProfileProcessor = new lambda.Function(this, 'UserProfileProcessor', {
      functionName: 'GovSaathi-UserProfileProcessor',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/user-profile'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 20,
      environment: {
        USERS_TABLE: usersTable.tableName,
      },
    });

    usersTable.grantReadWriteData(userProfileProcessor);

    userProfileProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'comprehend:DetectEntities',
          'comprehend:DetectKeyPhrases',
          'comprehend:DetectSentiment',
        ],
        resources: ['*'],
      })
    );

    // Lambda: Semantic Matcher
    const semanticMatcher = new lambda.Function(this, 'SemanticMatcher', {
      functionName: 'GovSaathi-SemanticMatcher',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/scheme-matcher'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      reservedConcurrentExecutions: 20,
      environment: {
        SCHEMES_TABLE: schemesTable.tableName,
        MATCH_CACHE_TABLE: matchCacheTable.tableName,
        PROMPTS_BUCKET: promptsBucket.bucketName,
      },
    });

    schemesTable.grantReadData(semanticMatcher);
    matchCacheTable.grantReadWriteData(semanticMatcher);
    promptsBucket.grantRead(semanticMatcher);

    semanticMatcher.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      })
    );

    // Lambda: Batch Ingestion Coordinator
    const batchCoordinator = new lambda.Function(this, 'BatchCoordinator', {
      functionName: 'GovSaathi-BatchCoordinator',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/batch-coordinator'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        RAW_BUCKET: rawSchemesBucket.bucketName,
      },
    });

    rawSchemesBucket.grantRead(batchCoordinator);

    // Step Functions: Batch Ingestion State Machine
    const processSchemeTask = new tasks.LambdaInvoke(this, 'ProcessScheme', {
      lambdaFunction: enhancedTextractProcessor,
      payload: stepfunctions.TaskInput.fromObject({
        'Records.$': '$.Records',
      }),
      resultPath: '$.processResult',
    });

    const batchMap = new stepfunctions.Map(this, 'ProcessSchemesMap', {
      maxConcurrency: 10,
      itemsPath: '$.schemes',
      parameters: {
        'Records.$': '$$.Map.Item.Value',
      },
    });

    batchMap.iterator(processSchemeTask);

    const batchIngestionStateMachine = new stepfunctions.StateMachine(
      this,
      'BatchIngestionStateMachine',
      {
        stateMachineName: 'GovSaathi-BatchIngestion',
        definition: batchMap,
        timeout: cdk.Duration.minutes(30),
      }
    );

    enhancedTextractProcessor.grantInvoke(batchIngestionStateMachine);

    // Enhanced API Gateway
    const api = new apigateway.RestApi(this, 'GovSaathiApiV2', {
      restApiName: 'GovSaathi API v2',
      description: 'Enhanced API with semantic search',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 10,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // API Resources
    const matchResource = api.root.addResource('match');
    matchResource.addMethod('POST', new apigateway.LambdaIntegration(semanticMatcher));

    const profileResource = api.root.addResource('profile');
    profileResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(userProfileProcessor)
    );

    const batchResource = api.root.addResource('batch-ingest');
    batchResource.addMethod(
      'POST',
      new apigateway.AwsIntegration({
        service: 'states',
        action: 'StartExecution',
        integrationHttpMethod: 'POST',
        options: {
          credentialsRole: new iam.Role(this, 'ApiGatewayStepFunctionsRole', {
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            inlinePolicies: {
              AllowStepFunctions: new iam.PolicyDocument({
                statements: [
                  new iam.PolicyStatement({
                    actions: ['states:StartExecution'],
                    resources: [batchIngestionStateMachine.stateMachineArn],
                  }),
                ],
              }),
            },
          }),
          requestTemplates: {
            'application/json': `{
              "stateMachineArn": "${batchIngestionStateMachine.stateMachineArn}",
              "input": "$util.escapeJavaScript($input.body)"
            }`,
          },
          integrationResponses: [
            {
              statusCode: '200',
              responseTemplates: {
                'application/json': '{"executionArn": "$input.path(\'$.executionArn\')"}',
              },
            },
          ],
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      }
    );

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrlV2', {
      value: api.url,
      description: 'API Gateway URL (Phase 2)',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      description: 'DynamoDB table for user profiles',
    });

    new cdk.CfnOutput(this, 'MatchCacheTableName', {
      value: matchCacheTable.tableName,
      description: 'DynamoDB table for match result caching',
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: batchIngestionStateMachine.stateMachineArn,
      description: 'Step Functions state machine for batch ingestion',
    });
  }
}
