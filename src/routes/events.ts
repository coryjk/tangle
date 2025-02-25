import express, { Request, Response } from 'express';
import { DynamoDBClient, ScanCommand, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { generateCreateEventSchema } from './util/schemaGenerator';

const router = express.Router();
const client = new DynamoDBClient({ 
    region: "us-east-1", 
    credentials: new AWS.SharedIniFileCredentials({ profile: "tangle-dev" })
});

const eventSchema = generateCreateEventSchema();

router.get('/events', async (request: Request, response: Response) => {
    // unused for now -- TODO: implement pagination
    const pageSize = (request.query['page_size']);
    const scanInput = {
        TableName: "events"
    }

    const command = new ScanCommand(scanInput);
    try{
        const scanResponse = await client.send(command);
        console.log(scanResponse);
        response.status(200).send(`Event: ${JSON.stringify(scanResponse)}`);
    } catch (err) {
        response.status(400).send();
        console.log(err);
    }
});

router.get('/events/:eventId', async (request: Request, response: Response) => {
    const getCommand = new GetItemCommand({
        TableName: "events", 
        Key: {
            events_uuid: {
                S: request.params.eventId
            }
        }
    });

    try {
        const awsResponse = await client.send(getCommand);
        console.log(awsResponse);
        response.status(200).send(`Event: ${JSON.stringify(awsResponse.Item)}`);
    } catch (err) {
        response.status(400).send();
        console.error(err);
    }
});

// router.patch('/events/:eventId', (request, response) => {
//     response.send(`Patching the ${request.params["eventId"]} event!`);
// });

router.post('/events', async (request, response) => {
    const { error } =  eventSchema.validate(request.body);

    if (error) {
        // if request doesn't pass JOI validation,
        // return 400 and end route execution
        console.error(error.details);
        response.status(400).send("Invalid request.");

        return;
    }

    const itemToPut = generateEventItem(request);
    const putItemInput = {
        "TableName": "events",
        "Item": itemToPut,
    }
    const command = new PutItemCommand(putItemInput);
    console.log(command)

    try {
        const putItemResponse = await client.send(command);
        console.log(putItemResponse);
        response.status(200).send(`Event: ${JSON.stringify(putItemResponse)}`);
    } catch (err) {
        response.status(400).send();
        console.error(err);
    }
});

// router.delete('/events/:eventId', (request, response) => {
//     response.send(`Deleting the ${request.params["eventId"]} event!`);
// });

function generateEventItem(request: Request) {
    return {
        "events_uuid": {
            "S": uuidv4(),
        },
        "title": {
            "S": request.body.title
        },
        "description": {
            "S": request.body.description
        },
        "host": {
            "S": request.body.host
        },
        "startTime": {
            "N": `${request.body.startTime}`
        },
        "endTime": {
            "N": `${request.body.endTime}`
        },
        "location": {
            "S": request.body.location
        },
        "attending": {
            "SS": request.body.attending
        },
        "maybeAttending": {
            "SS": request.body.maybeAttending
        },
        "notAttending": {
            "SS": request.body.notAttending
        }
    }
}

export const EVENTS_ROUTER = router;