# Partner to HDS Bridge

Machine to machine base service.
Handles registration and authorization for a service to communication with HDS backend.

## Description

This service acts as a proxy between a partner service and HDS and handles 
- The **onboarding** of the user, by allowing the to link their existing HDS account or to create a new one. 
- Keeping a reference map of the user ids of the partner and HDS as well as the authorization to interact with the user account on HDS.

### Data synchronization and transformation and plugin development

Data synchronization and transformation is specific for each partner. Each "bridge" should rely on at least one **plugin** handle data. The service is not designed to handle multiple plugins, but it is kept this way in order to perform ordinary tests alongisde plugin's. 

A sample plugin is available as a starting point in `sample-plugin` folder.

## Bridge API

### `Authorization`

Unless specified in the documentation, a secret has to be provided for each API call in the header `Authorization` this secret is set by the configuration setting `partnerAuthToken`. 

### `POST /user/onboard` Onboarding request

**@body**

  - `partnerUserId`: {string} partnerUserId 
  - `redirectURLs`: {Object} with 3 returnURL
    - `sucess`: {string} in case of success
    - `cancel`: {string} in case of cancel of operation by user
  - `clientData`: {Object} - key value object to be sent back as a query parameter or body of the web hook. This will also be provided to the plugin for new user initialization. 

**@returns**

Returns can be of two types `authrequest` or `userExists`

  - **type authRequest** 
    - `type`:  {string} 'authRequest' 
    - `onboardingSecret`: {string} Secret for machine to machine exchange will be sent alongside other parameters with web-hook calls (unique to this onboarding instance).
    - `redirectUserURLs`: {object} - you may add your own query string parameters to the following URLs to match a returning user.
      - `success`: {string} URL in case of success
      - `cancel`: {string} URL in case of cancelation by the user
    - `context`: {Object} In a standard usage of the bridge, you should not need to have any use for it. If interested, you will find documentation on [auth-request documentation.](https://pryv.github.io/reference/#auth-request) 

 - **type userExists** 
    - `type`:  {string} 'userExists' 
    - `user`: {Object} 
      - `active`: {boolean} Active / Non Active user
      - `partnerUserId`: {string} 
      - `apiEndpoint`: {string} Pryv.io API endpoint
      - `created`: {number} EPOCH 
      - `modified`: {number} EPOCH


**example**

Request: 

```json
{
  "partnerUserId": "xyz",
  "redirectURLs": {
    "success": "https://success.domain",
    "cancel": "https://cancel.domain"
  },
  "clientData": {
    "test": "Hello test"
  }
}
```

Response **userExists**: 

```json
{
  "type": "userExists",
  "user": {
    "active": true,
    "partnerUserId": "xyz",
    "apiEndpoint": "https://cm88fjzgk03njj8k9b3iad4bz@demo.datasafe.dev/fr90us3t/",
    "created": 1744112507.271,
    "modified": 1744112507.271
  }
}
```

Response **userExists**: 

### `GET /user/{partnerUserId}/status`

**@params**

  - `partnerUserId` (from URL)

**@returns** (status code 404 if not found)

  - Current partnerUserId status

    ```js
    {
      user: {
        active: true, // or false
        partnerUserId: 'xyz', // the user Id of your platform
        apiEndpoint:'https://{token}@{domain}/path', // pryvApiEndpoint including credentials
        created: 0000, // EPOCH time
        modified:  0000, // EPOCH time
      },
      syncStatus: {
        content: {
          // Object describing the sync status of this account todo 
        }
        lastSync:  0000, // EPOCH time
      }
    }
    ```

    Time is in milliseconds since 1970.

### `POST /user/{partnerUserId}/status`

Change the **active** status of a user

**@body**

  - `active`: {boolean} newStatus 

**@returns**

  - `active`: {boolean} newStatus

### `GET /account/errors/`

Retrieve the error log.

When failing during an onboarding process, for example, when contacting a webhook. Errors are kept on the bridge account.

**@query parameters**
- `limit`: {integer} max number of items 
- `fromTime`: {number} EPOCH time
- `toTime`: {number} EPOCH time

**@result**
Formated as a [Pryv event](https://pryv.github.io/reference/#data-structure-event) 

Notable information are 
- `content.message`: The message for this error
- `content.errorObject`: Details 

**@example**
```json
[
  {
    "type": "error/message-object",
    "streamIds": [
      "bridge-errors"
    ],
    "content": {
      "message": "Failed finalizing onboarding",
      "errorObject": {
        "partnerUserId": "a8jfl3u9",
        "pollParam": "https://demo.datasafe.dev/reg/access/HvAdcsaWV0tyLI4I",
        "innerErrorMessage": "Failed contacting partner backend",
        "innerErrorObject": {
          "webhookCall": {
            "whSettings": {
              "url": "http://127.0.0.1:8365/",
              "method": "GET",
              "headers": {
                "secret": "toto"
              }
            },
            "params": {
              "partnerUserId": "a8jfl3u9",
              "onboardingSecret": "UfgKmNil3o5gx9TtHR5MEp6M",
              "test": "Hello test",
              "type": "SUCCESS"
            }
          }
        }
      }
    },
    "time": 1744113582.638,
    "created": 1744113582.638,
    "createdBy": "cm8t0tdvm010mj8k94z4o48h7",
    "modified": 1744113582.638,
    "modifiedBy": "cm8t0tdvm010mj8k94z4o48h7",
    "integrity": "EVENT:0:sha256-GY4m/JMYvKj3v9Xhrrp3vWhAGdV0R3NGwCgdbapkQ8U=",
    "id": "cm98g719q03ofj8k9emca2qpc",
    "tags": [],
    "streamId": "bridge-errors"
  }
]
```


### Errors 

Errors are returned in json with the following properties

  - `error`: {string} message
  - `errorObject`: {object} details on the error

## Webhook 

A webhook on the partner server side will be notified of succes, failure or errors of the onboarding process

The settings for the webhook are defined under the `partnerURLs:webhookOnboard` in `localConfig.yml` with the settings are:

- `url`: {string} "http:... "
- `method`: {string} "GET" or "POST"
- `headers`: {Object as key - value} they will be sent with each webook call, you may set a secret token there.

**parameters** 
GET method: parameters are sent as query parameters
POST method: parameters are sent as query parameters in JSON as body

**'SUCCESS' or 'CANCEL'**
  - `type`: {string} "SUCCESS", "CANCEL"
  - `partnerUserId`: {string} 
  - `onboardingSecret`: {string} the secret for M2M security send during the onboarding initiate call.
  - `...`: {string} the content of the `clientData` key value sent during `POST /user/onboard` 
  - `pluginResultJSON`: {string} **Only in case of "SUCCESS"** the result provided by the plugin when a user is associated. It is sent a JSON to ensure a correct transmission with "GET" method
   - `status`: {string} "REFUSED" **Only in case of "CANCEL"** (no uses for now, maybe timeout in the future)

**'ERROR''**
`onboardingSecret`, and `clientData` values are optionnaly provided if the error happend after retreiving the onboarding session. 
  - `type`: {string} "ERROR"
  - `partnerUserId`: {string} 
  - `error`: {string} an error message
  - `errorObjectJSON`: {string} error details JSON stringified

## Redirect URLs
During the onboarding process the user can be redirected to 3 distinct. 
- for **SUCCESS** and **CANCEL** cases they are defined in the `POST /user/onboard` API call 
- for **ERROR** case this is defined with the setting `partnerURLs:defaultRedirectOnError` as the orginal request for inboarding might not be found. 

## Storage & Structure

A "Partner" account is used for storage on HDS 

This service uses a standard user on HDS to store the states of the onboarding process, eventual errors during communication and, finally, the authorized user credentials.

Given a rootStream ID to be set in the configuration file `service:bridgeAccountMainStreamId` (default "bridge") a set of streams will be created using this streamId as prefix + '-'. 
Exemple:
- **bridge**
  - **bridge-users**
    - **bridge-user-{partnerUserId}**
      Each user will have its own stream containing events of types: `temp-status/bridge-auth-request` and `credentials/pryv-api-endpoint`
  - **bridge-users-active**
    This stream is used for tagging, active `credentials/pryv-api-endpoint` as a secondary stream
  - **bridge-errors**
    This stream will log eventual errors regarding the onboarding process. For example if the web hook does not respond.


### TODOs

- [X] design initialization flow
- [X] endpoint to onboard patient
- [X] define return parameters 
- [X] create base stream structure for user
- [ ] Finalize base stream structure for user
- [ ] Add data synchronization status
- [ ] Deactivate and set the account as "unauthorized" when access is revoked.
- [ ] Allow partner to revoke an access
- [ ] Evaluate an erroRedirect for onbording with the same schema than forwarding the secret.
- [ ] Add a logic to ensure that the same account cannot be linked twice
- [ ] Remotely load & override config from partner Account (option)
- [X] Add security to check requests are coming from Partner


## Custom events-type 
Pryv default event types are listed here: https://pryv.github.io/event-types/

Here is the list of custom event-types used by the bridge

- **sync-status/bridge** to record each synchronization status (use on user's streams)
  - content: {object} -- freeform depends on each plugin flavor

- **temp-status/bridge-auth-request** to record each synchronization status (use on user's streams)
  - content: 
    - redirectURLs: given during the onboarding request
    - webhookClientData: given during the onboarding request
    - onboardingSecret: secret of M2M control
    - responseBody: result of https://pryv.github.io/reference/#auth-request


### Install for dev

For production read: [./INSTALL.md](./INSTALL.md) 

- `npm install`
- `npm run setup`
- `npm run setup-dev-env` (for dev environment)

Edit `localConfig.yml` you may get inspiration from `./config/sample-localConfig.yml`

for the setting: `bridgeApiEndPoint`; if you don't know it or don't yet have a "managing account" dedicated to the bridge. You may use the following command to create it or retrieve the apiEndpoint: 
`node tools/createBridgeAccountUser.js --config ./localConfig.js`
The token, must have access with 'manage' access rights to the corresponding to the setting `service:bridgeAccountMainStreamId`.


### Development 

- `npm run test` for testing
- `npm run test -- --grep={string}` test and grep 
- `npm run test:coverage` for coverage 

Appending `LOGS=info`, `LOGS=errors` or `DEBUG="*"` will change the level of output
Example `DEBUG=*config* npm run start` will show debug lines from configuration plugin

### Code

Please use `npm run lint` to validate your changes before committing

`npm run lint:fix` may fix some ;)

- Complete and use `errors.js` to generate coherent errors.
- For logging purposes check how `getLogger()` works
- Jsdoc is your friend
- Please write tests to achieve the best coverage.
