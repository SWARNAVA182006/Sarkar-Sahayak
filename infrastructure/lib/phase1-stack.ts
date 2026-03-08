import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class Phase1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Buckets
    const rawSchemesBucket = new s3.Bucket(this, 'RawSchemesBucket', {
      bucketName: `govsaathi-schemes-raw-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(7),
            },
          ],
        },
      ],
    });

    const processedBucket = new s3.Bucket(this, 'ProcessedBucket', {
      bucketName: `govsaathi-processed-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const promptsBucket = new s3.Bucket(this, 'PromptsBucket', {
      bucketName: `govsaathi-prompts-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // DynamoDB Tables
    const schemesTable = new dynamodb.Table(this, 'SchemesTable', {
      tableName: 'GovSaathi-Schemes',
      partitionKey: { name: 'scheme_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: false,
    });

    // Lambda: Textract Processor
    const textractProcessor = new lambda.Function(this, 'TextractProcessor', {
      functionName: 'GovSaathi-TextractProcessor',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/scheme-ingestion'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      reservedConcurrentExecutions: 20,
      environment: {
        PROCESSED_BUCKET: processedBucket.bucketName,
        PROMPTS_BUCKET: promptsBucket.bucketName,
      },
    });

    rawSchemesBucket.grantRead(textractProcessor);
    processedBucket.grantWrite(textractProcessor);
    promptsBucket.grantRead(textractProcessor);

    textractProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['textract:DetectDocumentText', 'textract:AnalyzeDocument'],
        resources: ['*'],
      })
    );

    textractProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        ],
      })
    );

    schemesTable.grantWriteData(textractProcessor);

    // S3 trigger for Textract processor
    rawSchemesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(textractProcessor),
      { suffix: '.pdf' }
    );

    // Lambda: API Handler
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      functionName: 'GovSaathi-ApiHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/api-handler'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 20,
      environment: {
        SCHEMES_TABLE: schemesTable.tableName,
        PROMPTS_BUCKET: promptsBucket.bucketName,
      },
    });

    schemesTable.grantReadData(apiHandler);
    promptsBucket.grantRead(apiHandler);

    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        ],
      })
    );

    // API Gateway
    const api = new apigateway.RestApi(this, 'GovSaathiApi', {
      restApiName: 'GovSaathi API',
      description: 'API for GovSaathi AI Platform',
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

    const matchResource = api.root.addResource('match');
    matchResource.addMethod('POST', new apigateway.LambdaIntegration(apiHandler));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'RawSchemesBucketName', {
      value: rawSchemesBucket.bucketName,
      description: 'S3 bucket for raw scheme PDFs',
    });

    new cdk.CfnOutput(this, 'ProcessedBucketName', {
      value: processedBucket.bucketName,
      description: 'S3 bucket for processed scheme text',
    });

    new cdk.CfnOutput(this, 'PromptsBucketName', {
      value: promptsBucket.bucketName,
      description: 'S3 bucket for Bedrock prompts',
    });

    new cdk.CfnOutput(this, 'SchemesTableName', {
      value: schemesTable.tableName,
      description: 'DynamoDB table for schemes',
    });
  }
}
