# ChartNeo To HDS Bridge

## Description

**Main task:** Handles the onboarding server <=> sever between Chartneo backend and HDS 

## Bridge API

### `POST /user/onboard` Onboarding request

**@parms**

  - `partnerUserId`: {string} partnerUserId 
  - `redirectURLs`: {Object} with 3 returnURL
    - `sucess`: {string} in case of success
    - `cancel`: {string}in case of cancel of operation by user
  - `clientData`: {Object} - key value object to be sent back as query params or body of the webhook

**@returns**

Returns can be of two types `authrequest` or `knownUser` (todo)

  - **type authRequest** 
  - `type`:  {string} 'authRequest' 
  - `onboardingSecret`: {string} Secret for machine to machine exchange, will be sent alongside other parameters with webhooks calls (unique to this onboarding instance).
  - `redirectUserURL`: {string} The url to redirect the user to.
  - `context`: {Object} In a standard usage of the bridge you should not need have no use for it. If interested you will find documentation on [auth-request documentation](https://pryv.github.io/reference/#auth-request) 


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
        apiEndpoint:'https://{token}@{domain}/path', // pryvApiEndpoint including credntails
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

    Time is is milliseconds since 1970.

#### `POST /user/{partnerUserId}/data`

handles RAW Pryv event conversion 

- **@params**
  - `partnerUserId` (from URL)
  - `data` - Todo
- **@returns**
  - Returns - todo

## Storage & Structure

An "Partner" account is used for storage on HDS 

This service, uses a standard user on HDS to store the states of the onboarding process, eventual errors during communication and finaly the authorized user credentials.

Given a rootStream ID to be set in configuration file `service:bridge-test-suite` (default "bridge") a set of streams will be created using this streamId as prefix + '-'. 
Exemple:
- **bridge**
  - **bridge-users**
    - **bride-user-{partnerUserId}**
      Each user will have it's own stream containing events of types: `temp-status/bridge-auth-request` and `credentials/pryv-api-endpoint`
  - **bridge-users-active**
    This stream is used for tagging, active `credentials/pryv-api-endpoint` as secondary stream
  - **bridge-errors**
    This stream will log eventual errors regarding the onboarding process. For exemple if the webhook does not respond.

### Install 

- `npm install`
- `npm run setup`
- `npm run setup-dev-env` (for dev environement)

Edit `localConfig.yml` you may get inspiration from `./config/sample-localConfig.yml`

for the setting: `bridgeApiEndPoint`; if you don't know it or don't yet have a "managing account" dedicated to the bridge. You may use the following command to create it or retreive the apiEndpoint: 
`node tools/createBridgeAccountUser.js --config ./localConfig.js`


### In production 

Read [./INSTALL.md](./INSTALL.md) 

### DEV 

- `npm run test` for testing
- `npm run test:coverage` for coverage 

### TODOs

- [ ] design initialization flow
- [ ] endpoint to onboard patient
- [ ] define return parameters 
- [ ] create base stream structure for user
- [ ] Finalize base stream structure for user
- [ ] Add security to check request are comming from ChartNeo



### Functional specifications

##### Onboarding


## Custom events-type 
On pryv defaults events types are listed here: https://pryv.github.io/event-types/

Here is the list of custom event-types used by the bridge

- **sync-status** to record each synchronization status (use on user's streams)
  - TODO

- **temp-status/bridge-auth-request** to record each synchronization status (use on user's streams)
  - content: 
    - redirectURLs: given during the onbaording request
    - webhookClientData: given during the onbaording request
    - onboardingSecret: secret for M2M control
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

Please use `npm run lint` to validate your changes before commiting

`npm run lint:fix` may fix some ;)

- Complete and use `errors.js` to generate coherent errors.
- For logging purposes check how `getLogger()` works
- Jsdoc is your friend
- Pull Request is good, use it when you want reviews. If your confident with your code, just push (and tell others).
- A sample test is present -- please write tests to achieve the best coverage.
