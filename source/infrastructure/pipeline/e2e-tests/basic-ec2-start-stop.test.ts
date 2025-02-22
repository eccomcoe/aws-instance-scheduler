// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as ec2 from "@aws-sdk/client-ec2";
import * as dynamodb from "@aws-sdk/client-dynamodb";

import { resourceParams } from "./basic-ec2-start-stop.test.resources";
import { delayMinutes } from "./index";
import { getInstanceState } from "./utils/ec2-test-utils";
import { createSchedule, currentTimePlus } from "./utils/schedule-test-utils";

const ec2Client = new ec2.EC2Client({});
const dynamoClient = new dynamodb.DynamoDBClient({});
const instanceId = resourceParams.ec2InstanceId;

test("instanceId exists", () => {
  expect(instanceId).not.toBeUndefined();
});
test("basic ec2 start-stop schedule", async () => {
  //stop instance
  await ec2Client.send(
    new ec2.StopInstancesCommand({
      InstanceIds: [instanceId],
    })
  );

  //confirm stopped
  await delayMinutes(1);
  expect(await getInstanceState(ec2Client, instanceId)).toBe(ec2.InstanceStateName.stopped);

  //create schedule
  await createSchedule(dynamoClient, {
    name: resourceParams.startStopTestScheduleName,
    description: `testing schedule`,
    periods: [
      {
        name: "ec2-start-stop-period",
        description: `testing period`,
        begintime: currentTimePlus(3),
        endtime: currentTimePlus(7),
      },
    ],
  });

  //confirm running during running period
  await delayMinutes(5);
  expect(await getInstanceState(ec2Client, instanceId)).toBe(ec2.InstanceStateName.running);

  //confirm stopped after stop time
  await delayMinutes(4);
  expect(await getInstanceState(ec2Client, instanceId)).toBe(ec2.InstanceStateName.stopped);
}, 900_000);
