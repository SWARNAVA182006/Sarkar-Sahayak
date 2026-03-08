#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Phase1Stack } from './lib/phase1-stack';
import { Phase2Stack } from './lib/phase2-stack';
import { Phase3Stack } from './lib/phase3-stack';
import { Phase4Stack } from './lib/phase4-stack';

const app = new cdk.App();

new Phase1Stack(app, 'Phase1Stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Project: 'GovSaathi',
    Phase: '1',
    CostCenter: 'Hackathon',
  },
});

new Phase2Stack(app, 'Phase2Stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Project: 'GovSaathi',
    Phase: '2',
    CostCenter: 'Hackathon',
  },
});

new Phase3Stack(app, 'Phase3Stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Project: 'GovSaathi',
    Phase: '3',
    CostCenter: 'Hackathon',
  },
});

new Phase4Stack(app, 'Phase4Stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Project: 'GovSaathi',
    Phase: '4',
    CostCenter: 'Hackathon',
  },
});
