import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

export class Phase3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import existing resources
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

    const usersTable = dynamodb.Table.fromTableName(
      this,
      'ImportedUsersTable',
      'GovSaathi-Users'
    );

    // New S3 Buckets for Phase 3
    const userDocumentsBucket = new s3.Bucket(this, 'UserDocumentsBucket', {
      bucketName: `govsaathi-user-docs-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30), // Delete after 30 days
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    const audioOutputBucket = new s3.Bucket(this, 'AudioOutputBucket', {
      bucketName: `govsaathi-audio-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(2), // Delete audio after 48 hours
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'GovSaathiUserPool', {
      userPoolName: 'GovSaathi-Users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        phone: true,
      },
      autoVerify: {
        email: true,
        phone: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'GovSaathiUserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    // Lambda: Voice Generator (Polly)
    const voiceGenerator = new lambda.Function(this, 'VoiceGenerator', {
      functionName: 'GovSaathi-VoiceGenerator',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/voice-generator'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 20,
      environment: {
        AUDIO_BUCKET: audioOutputBucket.bucketName,
      },
    });

    audioOutputBucket.grantWrite(voiceGenerator);

    voiceGenerator.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['polly:SynthesizeSpeech'],
        resources: ['*'],
      })
    );

    // Lambda: Document OCR
    const documentOcr = new lambda.Function(this, 'DocumentOcr', {
      functionName: 'GovSaathi-DocumentOcr',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/document-ocr'),
      timeout: cdk.Duration.minutes(2),
      memorySize: 1024,
      reservedConcurrentExecutions: 20,
      environment: {
        USERS_TABLE: usersTable.tableName,
      },
    });

    userDocumentsBucket.grantRead(documentOcr);
    usersTable.grantReadWriteData(documentOcr);

    documentOcr.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['textract:AnalyzeDocument', 'textract:DetectDocumentText'],
        resources: ['*'],
      })
    );

    // S3 trigger for document OCR
    userDocumentsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(documentOcr),
      { suffix: '.jpg' }
    );

    userDocumentsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(documentOcr),
      { suffix: '.png' }
    );

    // Lambda: Enhanced API Handler with Voice
    const enhancedApiHandler = new lambda.Function(this, 'EnhancedApiHandler', {
      functionName: 'GovSaathi-EnhancedApiHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/enhanced-api-handler'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 20,
      environment: {
        SCHEMES_TABLE: schemesTable.tableName,
        USERS_TABLE: usersTable.tableName,
        PROMPTS_BUCKET: promptsBucket.bucketName,
        AUDIO_BUCKET: audioOutputBucket.bucketName,
        VOICE_GENERATOR_FUNCTION: voiceGenerator.functionName,
      },
    });

    schemesTable.grantReadData(enhancedApiHandler);
    usersTable.grantReadData(enhancedApiHandler);
    promptsBucket.grantRead(enhancedApiHandler);
    audioOutputBucket.grantRead(enhancedApiHandler);
    voiceGenerator.grantInvoke(enhancedApiHandler);

    enhancedApiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        ],
      })
    );

    // API Gateway with Cognito Authorizer
    const api = new apigateway.RestApi(this, 'GovSaathiApiV3', {
      restApiName: 'GovSaathi API v3',
      description: 'API with voice output and authentication',
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
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'CognitoAuthorizer',
      {
        cognitoUserPools: [userPool],
      }
    );

    // API Resources
    const explainResource = api.root.addResource('explain');
    explainResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(enhancedApiHandler),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const voiceResource = api.root.addResource('voice');
    voiceResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(voiceGenerator),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const uploadResource = api.root.addResource('upload');
    const uploadUrlLambda = new lambda.Function(this, 'UploadUrlGenerator', {
      functionName: 'GovSaathi-UploadUrlGenerator',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { S3Client } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        
        const s3Client = new S3Client({});
        const BUCKET = process.env.USER_DOCS_BUCKET;
        
        exports.handler = async (event) => {
          const body = JSON.parse(event.body || '{}');
          const { file_name, content_type, user_id } = body;
          
          const key = \`\${user_id}/\${Date.now()}-\${file_name}\`;
          
          const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: content_type,
          });
          
          const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              upload_url: uploadUrl,
              key: key,
            }),
          };
        };
      `),
      timeout: cdk.Duration.seconds(10),
      environment: {
        USER_DOCS_BUCKET: userDocumentsBucket.bucketName,
      },
    });

    userDocumentsBucket.grantPut(uploadUrlLambda);

    uploadResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(uploadUrlLambda),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // CloudWatch Alarms
    const bedrockInvocationAlarm = new cloudwatch.Alarm(this, 'BedrockInvocationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Invocations',
        dimensionsMap: {
          FunctionName: enhancedApiHandler.functionName,
        },
        statistic: 'Sum',
        period: cdk.Duration.days(1),
      }),
      threshold: 500,
      evaluationPeriods: 1,
      alarmDescription: 'Alert when Bedrock invocations exceed 500/day',
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // SNS Topic for Alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: 'GovSaathi-Alerts',
      displayName: 'GovSaathi Cost and Usage Alerts',
    });

    bedrockInvocationAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrlV3', {
      value: api.url,
      description: 'API Gateway URL (Phase 3)',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'UserDocumentsBucketName', {
      value: userDocumentsBucket.bucketName,
      description: 'S3 bucket for user document uploads',
    });

    new cdk.CfnOutput(this, 'AudioOutputBucketName', {
      value: audioOutputBucket.bucketName,
      description: 'S3 bucket for Polly audio output',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS topic for cost alerts',
    });
  }
}
