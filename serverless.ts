/* eslint-disable no-template-curly-in-string */
import type { AWS } from "@serverless/typescript";
import resourcesTable from "./serverless/resources-table";
import accessTokensTable from "./serverless/access-tokens-table";

const serverlessConfiguration: AWS = {
  service: "lockbot",
  useDotenv: true,
  plugins: [
    "serverless-webpack",
    "serverless-dynamodb-local",
    "serverless-offline",
    "serverless-api-gateway-throttling",
  ],
  provider: {
    name: "aws",
    runtime: "nodejs12.x",
    environment: {
      SLACK_SIGNING_SECRET: "${env:SLACK_SIGNING_SECRET}",
      SLACK_CLIENT_ID: "${env:SLACK_CLIENT_ID}",
      SLACK_CLIENT_SECRET: "${env:SLACK_CLIENT_SECRET}",
      STATE_SECRET: "${env:STATE_SECRET}",
      RESOURCES_TABLE_NAME: "${self:custom.resourcesTableName}",
      INSTALLATIONS_TABLE_NAME: "${self:custom.installationsTableName}",
      ACCESS_TOKENS_TABLE_NAME: "${self:custom.accessTokensTableName}",
      SERVERLESS_STAGE: "${self:custom.stage}",
      API_GATEWAY_URL: {
        "Fn::Join": [
          "",
          [
            "https://",
            { Ref: "ApiGatewayRestApi" },
            ".execute-api.${self:custom.region}.amazonaws.com/${self:custom.stage}",
          ],
        ],
      },
    },
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: [
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
        ],
        Resource: [
          {
            "Fn::GetAtt": ["resourcesTable", "Arn"],
          },
          {
            "Fn::GetAtt": ["installationsTable", "Arn"],
          },
          {
            "Fn::GetAtt": ["accessTokensTable", "Arn"],
          },
        ],
      },
    ],
  },
  functions: {
    "slack-handler": {
      handler: "src/handlers/slack/index.handler",
      events: [
        {
          http: {
            method: "post",
            path: "/slack/events",
          },
        },
        {
          http: {
            method: "get",
            path: "/slack/install",
          },
        },
        {
          http: {
            method: "get",
            path: "/slack/oauth_redirect",
          },
        },
      ],
    },
    "api-handler": {
      handler: "src/handlers/api/index.handler",
      events: [
        {
          http: {
            method: "get",
            path: "/api/teams/{team}/channels/{channel}/locks",
          },
        },
        {
          http: {
            method: "post",
            path: "/api/teams/{team}/channels/{channel}/locks",
          },
        },
        {
          http: {
            method: "get",
            path: "/api/teams/{team}/channels/{channel}/locks/{lock}",
          },
        },
        {
          http: {
            method: "delete",
            path: "/api/teams/{team}/channels/{channel}/locks/{lock}",
          },
        },
      ],
    },
    swagger: {
      handler: "src/handlers/swagger/index.handler",
      events: [
        {
          http: {
            method: "get",
            path: "/api-docs",
          },
        },
        {
          http: {
            method: "get",
            path: "/openapi.json",
          },
        },
        {
          http: {
            method: "get",
            path: "/api-docs/openapi.json",
          },
        },
      ],
    },
  },
  resources: {
    Resources: {
      resourcesTable,
      installationsTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "${self:custom.installationsTableName}",
          AttributeDefinitions: [
            {
              AttributeName: "Team",
              AttributeType: "S",
            },
          ],
          KeySchema: [
            {
              AttributeName: "Team",
              KeyType: "HASH",
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 4,
            WriteCapacityUnits: 2,
          },
        },
      },
      accessTokensTable,
    },
  },
  custom: {
    stage: "${opt:stage, self:provider.stage}",
    region: "${opt:region, self:provider.region}",
    resourcesTableName: "${self:custom.stage}-lockbot-resources",
    installationsTableName: "${self:custom.stage}-lockbot-installations",
    accessTokensTableName: "${self:custom.stage}-lockbot-tokens",
    dynamodb: {
      stages: ["dev"],
    },
    apiGatewayThrottling: {
      maxRequestsPerSecond: 200,
      maxConcurrentRequests: 100,
    },
  },
};

module.exports = serverlessConfiguration;
