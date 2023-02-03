exports.handler = async (context, event, callback) => {
  try {
    // Load Libraries
    const helper = require(Runtime.getAssets()["/helper.js"].path);
    const client = context.getTwilioClient();
    const voiceRecordingSearchString = "Segment Link";

    // Debug: Console Log Incoming Events
    console.log("---Start of Raw Event---");
    console.log(JSON.stringify(event));
    console.log("---End of Raw Event---");

    // Optional: Verify Zendesk's Webhook Signature
    /* const zendeskSignature =
      event.request.headers["x-zendesk-webhook-signature"];
    const zendeskSignatureTimestamp =
      event.request.headers["x-zendesk-webhook-signature-timestamp"];
    const { request, ...zendeskPayload } = event;
    let rawEvent;
    if (Object.keys(zendeskPayload).length === 0) {
      rawEvent = "";
    } else {
      rawEvent = JSON.stringify(zendeskPayload);
    }
   
    const validateSignatureResult = .......
    
    if (!validateSignatureResult) {
      return callback("Signature Validation Failed");
    }
    */

    // Step 1: Formulate Zendesk Auth
    const auth = {
      subdomain: process.env.ZENDESK_SUBDOMAIN,
      username: process.env.ZENDESK_USER_EMAIL,
      apiToken: process.env.ZENDESK_API_TOKEN,
    };

    // Step 2: Retrieve Zendesk Ticket Comments, Parse it and Update Voice Comment on Zendesk Ticket
    const ticketComments = await helper.zendeskGetTicketComments(
      auth,
      event.ticket_id
    );
    if (!ticketComments || ticketComments.count <= 0) {
      console.log("Unable to retrieve Zendesk Ticket Comments");
      return callback("Unable to retrieve Zendesk Ticket Comments");
    }
    for (const comment of ticketComments.comments) {
      // -- Look for Voice Recording's Search String
      if (comment.body.indexOf(voiceRecordingSearchString) > -1) {
        // -- Parse Zendesk Ticket Comment
        const formattedSearchString = voiceRecordingSearchString.replace(
          " ",
          "_"
        );
        const splitAryLineBreak = comment.body.split("\n");
        if (splitAryLineBreak.length === 0) {
          console.log("Unable to parse internal comments");
          return callback("Unable to parse internal comments");
        }
        // -- Convert to JSON Object
        let parsedValues = {};
        for (const splitPair of splitAryLineBreak) {
          if (splitPair.indexOf(voiceRecordingSearchString) > -1) {
            parsedValues[formattedSearchString] = splitPair
              .replace(`${voiceRecordingSearchString}:`, "")
              .trim();
          } else {
            const splitKeyValue = splitPair.split(":");
            const key = splitKeyValue[0].trim().replace(" ", "_");
            const value = splitKeyValue[1].trim();
            parsedValues[key] = value;
          }
        }
        // -- Obtain Call Resources and Metadata
        const callSid = parsedValues["Call_Sid"];
        const callRecordingSegmentLink = parsedValues[formattedSearchString];
        const callRecordingSid =
          callRecordingSegmentLink.match(/([^\/]+$)/gm)[0];

        // -- Get Call Resource
        const callResource = await helper.twilioGetCallResource(
          client,
          callSid
        );

        // -- Get Call Recording
        const callRecording = await helper.twilioGetCallRecording(
          client,
          callRecordingSid
        );

        // Debug: Console Log Incoming Events
        console.log("---Start of Debug Call Resource---");
        console.log(callResource);
        console.log(callRecordingSegmentLink);
        console.log("---End of Debug Call Resource---");

        // -- Formulate Zendesk Update Payload
        const updateZendeskTicketPayload = {
          ticket: {
            voice_comment: {
              from: callResource.from,
              to: callResource.to,
              call_duration: parseInt(callRecording.duration),
              started_at: callResource.startTime,
              recording_url: callRecordingSegmentLink,
            },
          },
        };
        // -- Update Zendesk Ticket with Voice Comment
        const updateResult = await helper.zendeskUpdateTicketVoiceComment(
          auth,
          event.ticket_id,
          updateZendeskTicketPayload
        );
        return callback(null, {
          success: true,
        });
      }
    }
    return callback(null, {
      success: true,
    });
  } catch (err) {
    console.log(err);
    return callback("outer catch error");
  }
};
