# ChartNeo To HDS Bridge

## Description

**Main task:** Handles the onboarding<=> between Chartneo backend and HDS 

## Bridge API

### `POST /user/onboard` Onboarding request

**@params**

  - `partnerUserId`: {string} partnerUserId 
  - `redirectURLs`: {Object} with 3 returnURL
    - `sucess`: {string} in case of success
    - `cancel`: {string} in case of cancel of operation by user
  - `clientData`: {Object} - key value object to be sent back as a query parameter or body of the web hook

**@returns**

Returns can be of two types `authrequest` or `knownUser` (todo)

  - **type authRequest** 
  - `type`:  {string} 'authRequest' 
  - `onboardingSecret`: {string} Secret for machine to machine exchange will be sent alongside other parameters with web-hook calls (unique to this onboarding instance).
  - `redirectUserURL`: {string} The URL to redirect the user to.
  - `context`: {Object} In a standard usage of the bridge, you should not need to have any use for it. If interested, you will find documentation on [auth-request documentation.](https://pryv.github.io/reference/#auth-request) 


#### `GET /user/{partnerUserId}/status`

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

    Time is milliseconds since 1970.

#### `POST /user/{partnerUserId}/data`

handles RAW Pryv event conversion 

- **@params**
  - `partnerUserId` (from URL)
  - `data` - Todo
- **@returns**
  - Returns - todo

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

### Install 

- `npm install`
- `npm run setup`
- `npm run setup-dev-env` (for dev environement)

Edit `localConfig.yml` you may get inspiration from `./config/sample-localConfig.yml`

for the setting: `bridgeApiEndPoint`; if you don't know it or don't yet have a "managing account" dedicated to the bridge. You may use the following command to create it or retrieve the apiEndpoint: 
`node tools/createBridgeAccountUser.js --config ./localConfig.js`
The token, must have access with 'manage' access rights to the corresponding to the setting `service:bridgeAccountMainStreamId`.


### In production 

Read [./INSTALL.md](./INSTALL.md) 

### DEV 

- `npm run test` for testing
- `npm run test:coverage` for coverage 

### TODOs

- [X] design initialization flow
- [X] endpoint to onboard patient
- [X] define return parameters 
- [X] create base stream structure for user
- [ ] Finalize base stream structure for user
- [ ] Add security to check request are comming from ChartNeo



### Functional specifications

##### Onboarding


## Custom events-type 
Pryv default event types are listed here: https://pryv.github.io/event-types/

Here is the list of custom event-types used by the bridge

- **sync-status** to record each synchronization status (use on user's streams)
  - TODO

- **temp-status/bridge-auth-request** to record each synchronization status (use on user's streams)
  - content: 
    - redirectURLs: given during the onboarding request
    - webhookClientData: given during the onboarding request
    - onboardingSecret: secret of M2M control
    - responseBody: result of https://pryv.github.io/reference/#auth-request

## Install

Production: `npm run setup`
Development: `npm run setup-dev-env`

## RUN

- start dev: `npm run start`
- start prod: `npm run start:prod`
- tests: `npm run test`
- test and grep `npm run test -- --grep={string}`
- coverage: `npm run test:coverage`

Appending `LOGS=info`, `LOGS=errors` or `DEBUG="*"` will change the level of output
Example `DEBUG=*config* npm run start` will show debug lines from configuration plugin

## CODE

Please use `npm run lint` to validate your changes before committing

`npm run lint:fix` may fix some ;)

- Complete and use `errors.js` to generate coherent errors.
- For logging purposes check how `getLogger()` works
- Jsdoc is your friend
- Please write tests to achieve the best coverage.
