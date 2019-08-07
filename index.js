const AssistantV2 = require('ibm-watson/assistant/v2');
const PAGE_ACCESS_TOKEN = 'EAAGM47EckQcBAPFRZAXZBap5vqEcxIV3jP4GCWzaZBFq6P28ZAgZBv81kdY5ZAxRNXb2KcS7wtxNOo7VtYw3TueGS24ruHCz3IZCJhTnZCJs3wPyAXwvVNLxdgsV6ZCF6UAnlmNOa8D34jJEi4fG79eEbKWqoRM2JsXZC6VoDM4TglTGgKQs0lkY1Q'
var express = require('express')
var request = require('request')
var base64 = require('node-base64-image')
var https = require('https')
var bodyParser = require("body-parser")
var senderArr = [];
var sessArr = [];


var app = express();
app.use(bodyParser.json());

const service = new AssistantV2({
  iam_apikey: 'uMV9hKkWre8HeZhZmgDPxr6OAAu8D145_2wo1JTlDpr4',
  version: '2019-02-28',
  url: 'https://gateway-fra.watsonplatform.net/assistant/api'
});

// var session_id
var assistant_id = 'c2b52a1e-1a3c-403f-8b01-6df1c978605d'
var action
var bird
var status


app.post('/webhook', (req, res) => {

  // Parse the request body from the POST
  //console.log(req.body);
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      //console.log(webhook_event);


      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      //console.log('Sender ID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function

      handleMessage(sender_psid, webhook_event.message);

    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {

  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = "abcd";

  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Check if a token and mode were sent
  if (mode && token) {

    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

function creatSess(index) {
  return new Promise(function(resolve) {
    service.createSession({
        assistant_id: assistant_id
      })
      .then(res => {
        //console.log("I want to replace " + index)
        sessArr[index] = res.session_id // ba7ot el session id el gedeed fel index beta3 el adeem elly el session beta3to ended
        //console.log(res);
        resolve();
      })
      .catch(err => {
        console.log(err);
      });
  })
}

function sendMs(word, session_id) {
  return new Promise(function(resolve, reject) {
    service.message({
        assistant_id: assistant_id,
        session_id: session_id,
        context: {
          'global': {
            'system': {
              'user_id': 'my_user_id'
            }
          },
          "skills": {
            "main skill": {
              "user_defined": {
                "action": action,
                "bird": bird,
                "status": status
              }
            }
          }
        },
        input: {
          'message_type': 'text',
          'text': word,
          'options': {
            'return_context': true
          }
        }
      })
      .then(response => {
        //console.log(response.output.generic[0].text);
        //console.log(response.context.skills);
        try {
          resolve(response.output.generic[0].text)
          //Returns a text response from watson
        } catch (err) {
          resolve(null)
          //Returns null if watson does not retrun text
        }
      })
      .catch(err => {
        reject(err);
      });
  })
}

function handleMessage(sender_psid, received_message) {


  var i = 0
  var flag = false;

  if (senderArr.length == 0) {
    senderArr.push(sender_psid);
    creatSess(0)
      .then(function() {
        sendMs(received_message.text, sessArr[0])
          .then(answer => {
            callSendAPI(sender_psid, {
              'text': answer
            });
          })
      })

  } else {
    for (i = 0; i < senderArr.length; i++) { //badawar law sender id mawgood fel array
      if (sender_psid == senderArr[i]) { // sender found
        flag = true;
        let index = i

        // Checks if the message contains text
        if (received_message.text) {

          // Create the payload for a basic text message, which
          // will be added to the body of our request to the Send API
          sendMs(received_message.text, sessArr[index]).then(answer => {
              if (answer == null) {
                // If no text is returned, action from context is required
                callSendAPI(sender_psid, {
                  'text': "No response from watson"
                })
                return
              } else {
                callSendAPI(sender_psid, {
                  'text': answer
                });
                return
              }
            })
            .catch(err => {
              creatSess(index)
                .then(function() {
                  sendMs(received_message.text, sessArr[index])
                    .then(answer => {
                      if (answer == null) {
                        // If no text is returned, action from context is required
                        callSendAPI(sender_psid, {
                          'text': "No response from watson"
                        })
                        return
                      } else {
                        callSendAPI(sender_psid, {
                          'text': answer
                        })
                        return
                      }
                    })
                })
            })

        } else if (received_message.attachments) {

          // var imageUrl = received_message.attachments[0].payload.url
          // encode(imageUrl)
          //   .then(jsonImage => {
          //     uploadToNetwork(jsonImage)
          //       .then(function() {
          //         handleMessage(sender_psid, {
          //           'text': "ok"
          //         })
          //       })
          //   })

          callSendAPI(sender_psid, {
            "attachment": {
              "type": "image",
              "payload": {
                "url": imagetest,
                "is_reusable": true
              }
            }
          })

        }
      }

    }
    if (!flag) {

      senderArr.push(sender_psid);
      creatSess(sessArr.length) // 3ashan ana 3ayza a5er index.....
        .then(hi => {
          sendMs(received_message.text, sessArr[i])
            .then(answer => {
              if (answer == null) {
                // If no text is returned, action from context is required
                callSendAPI(sender_psid, {
                  'text': "No response from watson"
                })
                return
              } else {
                callSendAPI(sender_psid, {
                  'text': answer
                })
                return
              }
            })
        })
    }
  }


}

function callSendAPI(sender_psid, response) {

  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": 'https://graph.facebook.com/v4.0/me/messages?access_token=EAAGM47EckQcBAPFRZAXZBap5vqEcxIV3jP4GCWzaZBFq6P28ZAgZBv81kdY5ZAxRNXb2KcS7wtxNOo7VtYw3TueGS24ruHCz3IZCJhTnZCJs3wPyAXwvVNLxdgsV6ZCF6UAnlmNOa8D34jJEi4fG79eEbKWqoRM2JsXZC6VoDM4TglTGgKQs0lkY1Q',
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      //console.log(response)
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

function encode(imageUrl) {
  var options = {
    string: true
  }
  return new Promise(function(resolve, reject) {
    base64.encode(imageUrl, options, function(err, image) {
      if (err) {
        reject(err)
      } else {
        resolve(image)
      }
    })
  })
}


function uploadToNetwork(jsonImage) {
  return new Promise(function(resolve, reject) {

    request.post({
      url: "https://flask-reliable-ardvark.cfapps.io/predict",
      json: {
        image: jsonImage
      },
    }, function(error, response, body) {
      if (!error) {
        console.log(body);
        var parsedjson = JSON.parse(body)
        bird = parsedjson.Result
        status = 'true'
        resolve()
      } else {
        status = 'false'
        console.log(error);
        reject()
      }
    })
  })
}


app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));




/*


all .get / .post put in its own 'express file'
Watson module
Messenger module : Message Handles / Send Api for facebook
Image Encoding / Decoding
Error logging and auditing

save context in another file

implement array in a database


properties file for passswords and tokens
use of variable/let/constants
*/