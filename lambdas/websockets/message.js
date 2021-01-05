const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const AppSync = require('../common/AppSync');
const gql = require('graphql-tag');

const tableName = process.env.tableName;
const apiTableName = process.env.apiTableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;

    const body = JSON.parse(event.body);

    try {
        const ourRecord = await Dynamo.get(connectionID, tableName);
        const { domainName, stage } = ourRecord;

        const message = body.message;
        
        if (message === "connect") {
            const data = {
                ...ourRecord,
                status : "connected"
            }
            
            await Dynamo.write(data, tableName);

            const apiRecord = await Dynamo.getApi(body.appID, apiTableName);
            console.log("####### REQUEST API RECORD #######");
            console.log(apiRecord);

            const { sessionCount } = apiRecord;

            console.log("############# ---- CONNECTED ---- ################");
            const mutation = gql(`
                mutation UpdateSessionCountCreateSession {
                    updateApiKey(input: {id: "${body.appID}", sessionCount: ${sessionCount+1}}) {
                        appName
                        id
                        sessionCount
                    }
                    createSession(input: {apiKeyID: "${body.appID}", id: "${connectionID}", type: "CONNECT"}) {
                        createdAt
                        type
                        id
                        apiKeyID
                    }
                }
            `);
            await AppSync.graphqlClient.mutate({ mutation }).then(res => console.log(res)).catch(err => console.log(err));
            
            console.log("############# ---- CONNECTED DONE ---- ################");

            await WebSocket.send({
                domainName,
                stage,
                connectionID,
                message: `{ "status": "connect", "id": "${connectionID}" }`,
            });
        }
        
        console.log("############# ---- SEND PRE ---- ################");
        if (message === "send") {

            const appID = body.appID;
            const to = body.to;

            const requestRecord = await Dynamo.get(to, tableName);
            console.log("####### REQUEST RECORD #######");
            console.log(requestRecord);

            console.log("APP ID : ", appID);
            console.log("TO : ", to);

            const apiRecord = await Dynamo.getApi(appID, apiTableName);
            console.log("####### REQUEST API RECORD #######");
            console.log(apiRecord);

            const { sessionCount } = apiRecord;
            console.log("###### SESSION COUNT ########")
            console.log(sessionCount);

            console.log("############# ---- SEND ---- ################");
            console.log(apiRecord);
            console.log(requestRecord);

            if (requestRecord) {

                const sc = sessionCount + 1;

                // const updatedApiRecord = {
                //     ...apiRecord, 
                //     sessionCount: sc
                // }

                // console.log(updatedApiRecord);

                console.log("############# ---- UPDATE ---- ################");
                const mutation = gql(`
                    mutation UpdateSessionCountCreateSession {
                        updateApiKey(input: {id: "${body.appID}", sessionCount: ${sc}}) {
                            appName
                            id
                            sessionCount
                        }
                        createSession(input: {apiKeyID: "${body.appID}", id: "${connectionID}", type: "TRANSFER"}) {
                            createdAt
                            type
                            id
                            apiKeyID
                        }
                    }
                `);
                await AppSync.graphqlClient.mutate({ mutation }).then(res => console.log(res)).catch(err => console.log(err));
                
                console.log("############# ---- UPDATE DONE ---- ################");

                // await Dynamo.writeApi(updatedApiRecord, apiTableName).then(res => console.log(res)).catch(err => console.log(err));

                console.log("######## UPSss #######");

                await WebSocket.send({
                    domainName,
                    stage,
                    connectionID : to,
                    message: `{ "status": "send", "response": "FROM USER : ${connectionID}", "data": "${body.data}" }`,
                });

                
            } else {
                await WebSocket.send({
                    domainName,
                    stage,
                    connectionID,
                    message: `{ "status": "send", "response" : "USER ${to} not found :( " }`,
                });
            }
        }
        
        return Responses._200({ message: 'got a message' });
    } catch (error) {
        return Responses._400({ message: 'message could not be received' });
    }

    return Responses._200({ message: 'got a message' });
};