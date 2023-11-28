import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import {  Stack,  StackProps,  aws_dynamodb as dynamodb,   aws_ecs as ecs, aws_lambda as lambda } from 'aws-cdk-lib';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new s3.Bucket(this, 'jwoodb58-cdk-bucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    
    const webDistribution = new cloudfront.Distribution(this, 'VueCDKDemoSiteDistributionJeffrey', {
      defaultBehavior: { origin: new origins.S3Origin(websiteBucket) 
      },
    });

    const websiteDeploy = new s3deploy.BucketDeployment(this, 'VueCDKDemoSiteDeploymentJeffrey', {
      sources: [s3deploy.Source.asset('../dist')],
      destinationBucket: websiteBucket,
      distribution: webDistribution,
      distributionPaths: ['/*'],
    });

    const tableName = process.env.DYNAMO_TABLE_NAME || 'cdkTableJeffrey';

    const table = new dynamodb.Table(this, tableName, { 
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }, 
      sortKey: {
        name: 'question',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED, 
      readCapacity: 20,
      writeCapacity: 20,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      tableClass: dynamodb.TableClass.STANDARD_INFREQUENT_ACCESS,
    });

     table.addLocalSecondaryIndex({
       indexName: 'imageUrlIndex',
       sortKey: {name: 'imageUrl', type: dynamodb.AttributeType.STRING},
       projectionType: dynamodb.ProjectionType.ALL
    });

     // Lambda Function
     const lambdaFunction = new lambda.Function(this, 'CDKStackLambdaFunctionJeffrey', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'), // Assuming your Lambda code is in the 'lambda' directory
      environment: {
        DYNAMO_TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(lambdaFunction);

    const api = new apigateway.RestApi(this, 'cdkStackApiGatewayJeffrey1', {
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:8080'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
        maxAge: cdk.Duration.days(10),
        exposeHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers'],
      },
    });

    const integration = new apigateway.LambdaIntegration(lambdaFunction);
    api.root.addMethod('GET', integration);
    api.root.addMethod('POST', integration);


     // Output the S3 bucket URL and API Gateway URL for reference
     new cdk.CfnOutput(this, 'VueAppBucketURL', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'URL for the Vue.js App hosted in S3',
    });

    new cdk.CfnOutput(this, 'ApiGatewayURL', {
      value: api.url,
      description: 'URL for the API Gateway endpoint',
    });

  }
}
