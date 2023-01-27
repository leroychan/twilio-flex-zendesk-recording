// Load Libraries
const request = require("request-promise-native");

/*
 * Wrapped Function - Twilio - Get Call Recording
 */

const twilioGetCallRecording = async (client, callRecordingSid) => {
  try {
    const callResource = await client.recordings(callRecordingSid).fetch();
    return callResource;
  } catch (err) {
    console.log(err);
    return err;
  }
};

/*
 * Wrapped Function - Twilio - Get Call Resource
 */

const twilioGetCallResource = async (client, callSid) => {
  try {
    const callResource = await client.calls(callSid).fetch();
    return callResource;
  } catch (err) {
    console.log(err);
    return err;
  }
};

/*
 * Raw Function - Zendesk - Get Ticket Comments
 */

const zendeskGetTicketComments = async (auth, ticketId) => {
  const options = {
    url: `https://${auth.subdomain}.zendesk.com/api/v2/tickets/${ticketId}/comments`,
    method: "GET",
    auth: {
      username: `${auth.username}/token`,
      password: auth.apiToken,
    },
    json: true,
  };
  const result = await request(options);
  return result;
};

/*
 * Raw Function - Zendesk - Update Ticket with Voice Comment
 */

const zendeskUpdateTicketVoiceComment = async (auth, ticketId, payload) => {
  const options = {
    url: `https://${auth.subdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`,
    method: "PUT",
    auth: {
      username: `${auth.username}/token`,
      password: auth.apiToken,
    },
    body: payload,
    json: true,
  };
  const result = await request(options);
  return result;
};

module.exports = {
  twilioGetCallResource,
  twilioGetCallRecording,
  zendeskGetTicketComments,
  zendeskUpdateTicketVoiceComment,
};
